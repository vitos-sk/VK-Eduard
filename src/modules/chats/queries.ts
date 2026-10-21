import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types.gen";

type Client = SupabaseClient<Database>;

export interface ChatSummary {
  id: string;
  kind: "person" | "site";
  /** Собеседник; у чата объекта его нет. */
  otherId: string | null;
  /** Заголовок чата: имя собеседника, а у чата объекта — название объекта. */
  otherName: string;
  otherAvatarPath: string | null;
  /** Объект, к которому привязан чат; у чата 1 на 1 — `null`. */
  siteId: string | null;
  lastAt: string;
  lastKind: "text" | "checklist" | null;
  lastBody: string | null;
  lastTitle: string | null;
  lastSenderId: string | null;
  unread: number;
}

/** Чаты человека: новые сверху, с последним сообщением и числом непрочитанных (`my_chats`). */
export async function getMyChats(supabase: Client): Promise<ChatSummary[]> {
  const { data, error } = await supabase.rpc("my_chats");
  if (error) throw error;

  const rows = data ?? [];
  const otherIds = [...new Set(rows.flatMap((row) => (row.out_other ? [row.out_other] : [])))];

  const { data: people, error: peopleError } = otherIds.length
    ? await supabase.from("profiles").select("id, full_name, avatar_path").in("id", otherIds)
    : { data: [], error: null };
  if (peopleError) throw peopleError;

  const byId = new Map((people ?? []).map((person) => [person.id, person]));

  return rows.map((row) => ({
    id: row.out_chat,
    kind: row.out_site ? ("site" as const) : ("person" as const),
    otherId: row.out_other,
    otherName: row.out_site ? (row.out_site_name ?? "") : ((row.out_other && byId.get(row.out_other)?.full_name) || ""),
    otherAvatarPath: (row.out_other && byId.get(row.out_other)?.avatar_path) || null,
    siteId: row.out_site,
    lastAt: row.out_last_at,
    lastKind: row.out_last_kind === "text" || row.out_last_kind === "checklist" ? row.out_last_kind : null,
    lastBody: row.out_last_body,
    lastTitle: row.out_last_title,
    lastSenderId: row.out_last_sender,
    unread: row.out_unread,
  }));
}

export interface ChatHeader {
  id: string;
  kind: "person" | "site";
  /** Объект, к которому привязан чат; у чата 1 на 1 — `null`. */
  siteId: string | null;
  /** Собеседник; у чата объекта его нет. */
  otherId: string | null;
  /** Заголовок чата: имя собеседника, а у чата объекта — название объекта. */
  otherName: string;
  otherAvatarPath: string | null;
  otherIsBoss: boolean;
}

/** Шапка чата. `null` — такого чата нет или человек в нём не участник (RLS скрывает чужие чаты как несуществующие). */
export async function getChat(supabase: Client, chatId: string, myId: string): Promise<ChatHeader | null> {
  const { data, error } = await supabase
    .from("chats")
    .select("id, user_a, user_b, site_id, sites(name)")
    .eq("id", chatId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  if (data.site_id) {
    return {
      id: data.id,
      kind: "site",
      siteId: data.site_id,
      otherId: null,
      otherName: data.sites?.name ?? "",
      otherAvatarPath: null,
      otherIsBoss: false,
    };
  }

  const otherId = data.user_a === myId ? data.user_b : data.user_a;
  if (!otherId) return null;
  const { data: person, error: personError } = await supabase
    .from("profiles")
    .select("full_name, avatar_path, role")
    .eq("id", otherId)
    .maybeSingle();
  if (personError) throw personError;

  return {
    id: data.id,
    kind: "person",
    siteId: null,
    otherId,
    otherName: person?.full_name ?? "",
    otherAvatarPath: person?.avatar_path ?? null,
    otherIsBoss: person?.role === "boss",
  };
}

/** Сколько последних сообщений показываем. Старше — не подгружаем: чаты здесь рабочие и короткие. */
export const MESSAGES_LIMIT = 200;

export interface ChatMessageView {
  id: string;
  senderId: string;
  kind: "text" | "checklist";
  body: string | null;
  createdAt: string;
  /** Имя автора (в чате объекта оно подписывается над чужими сообщениями). */
  senderName: string | null;
  /** Для карточки чеклиста: копия получателя, её пункты и прогресс. `null` — копию удалили. */
  checklist: {
    id: string;
    title: string;
    ownerId: string;
    done: number;
    total: number;
    items: { id: string; text: string; doneAt: string | null; doneById: string | null; doneByName: string | null }[];
  } | null;
}

/** Сообщения чата по возрастанию времени (старые сверху, как в переписке). */
export async function getChatMessages(supabase: Client, chatId: string): Promise<ChatMessageView[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, sender_id, kind, body, created_at, sender:profiles!chat_messages_sender_id_fkey(full_name), checklists(id, title, owner_id, checklist_items(id, text, sort_order, done_at, done_by, doneBy:profiles!checklist_items_done_by_fkey(full_name)))")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(MESSAGES_LIMIT);
  if (error) throw error;

  return (data ?? [])
    .map((row) => ({
      id: row.id,
      senderId: row.sender_id,
      kind: row.kind === "checklist" ? ("checklist" as const) : ("text" as const),
      body: row.body,
      createdAt: row.created_at,
      senderName: row.sender?.full_name ?? null,
      checklist: row.checklists
        ? {
            id: row.checklists.id,
            title: row.checklists.title,
            ownerId: row.checklists.owner_id,
            done: row.checklists.checklist_items.filter((item) => item.done_at !== null).length,
            total: row.checklists.checklist_items.length,
            items: [...row.checklists.checklist_items]
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((item) => ({
                id: item.id,
                text: item.text,
                doneAt: item.done_at,
                doneById: item.done_by,
                doneByName: item.doneBy?.full_name ?? null,
              })),
          }
        : null,
    }))
    .reverse();
}

/** Чат объекта этого сотрудника (создаётся при первом обращении). `null` — объект не найден или не из его фирмы. */
export async function openSiteChat(supabase: Client, siteId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("open_site_chat", { p_site: siteId });

  return error || !data ? null : data;
}

/** Id чата между двумя людьми, если он есть (пара всегда хранится упорядоченной). */
export async function findChatId(supabase: Client, a: string, b: string): Promise<string | null> {
  const [first, second] = a < b ? [a, b] : [b, a];
  const { data, error } = await supabase.from("chats").select("id").eq("user_a", first).eq("user_b", second).maybeSingle();
  if (error) throw error;

  return data?.id ?? null;
}

/** Число непрочитанных во всех чатах — для значка на главной. Без имён собеседников: нужен один запрос. */
export async function getUnreadCount(supabase: Client): Promise<number> {
  const { data, error } = await supabase.rpc("my_chats");
  if (error) throw error;

  return (data ?? []).reduce((sum, row) => sum + row.out_unread, 0);
}

export interface Colleague {
  id: string;
  name: string;
  avatarPath: string | null;
  isBoss: boolean;
}

/** Активные сотрудники фирмы, кроме самого человека: кому можно написать или отправить чеклист. */
export async function getColleagues(supabase: Client, myId: string): Promise<Colleague[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_path, role")
    .eq("is_active", true)
    .neq("id", myId)
    .order("full_name", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.full_name,
    avatarPath: row.avatar_path,
    isBoss: row.role === "boss",
  }));
}
