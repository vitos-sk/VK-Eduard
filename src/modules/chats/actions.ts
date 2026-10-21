"use server";

import { revalidatePath } from "next/cache";

import { getT } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/modules/auth/session";
import { notifyUser } from "@/modules/notifications/notify";

import { normalizeMessage } from "./rules";
import { chatPushText, chatUrl, siteSender } from "./texts";

/** Код Postgres «нарушение уникальности»: сообщение с таким `client_id` уже есть (повторная отправка). */
const UNIQUE_VIOLATION = "23505";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** Активные сотрудники фирмы, кроме самого человека: им уходит push из чата объекта (круг сужают права базы). */
async function siteChatRecipients(supabase: ServerClient, meId: string): Promise<string[]> {
  const { data } = await supabase.from("profiles").select("id").eq("is_active", true);

  return (data ?? []).map((row) => row.id).filter((id) => id !== meId);
}

export type StartChatState = { error: string; chatId: null } | { error: null; chatId: string };

/** Открывает чат 1 на 1 с коллегой (создаёт, если ещё нет). */
export async function startChat(otherId: string): Promise<StartChatState> {
  const t = await getT();
  const profile = await getProfile();
  if (!profile) return { error: t.auth.noProfile, chatId: null };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_chat", { p_other: otherId });

  if (error || !data) return { error: t.chats.startError, chatId: null };

  revalidatePath("/chats");

  return { error: null, chatId: data };
}

export interface SendMessageInput {
  chatId: string;
  text: string;
  /** Один на сообщение: форма создаёт его заранее и шлёт при каждой попытке — повтор не плодит дубли. */
  clientId: string;
}

export type SendMessageState = { error: string | null };

/** Пишет сообщение в чат и отправляет собеседнику push. */
export async function sendChatMessage(input: SendMessageInput): Promise<SendMessageState> {
  const t = await getT();
  const profile = await getProfile();
  if (!profile) return { error: t.auth.noProfile };

  const text = normalizeMessage(input.text);
  if (text === null) return { error: t.chats.sendError };

  const supabase = await createClient();
  const { error } = await supabase
    .from("chat_messages")
    .insert({ client_id: input.clientId, chat_id: input.chatId, sender_id: profile.id, kind: "text", body: text });

  // Это же сообщение уже сохранено прошлой попыткой: считаем отправленным, но второй push не шлём.
  if (error?.code === UNIQUE_VIOLATION) return { error: null };
  if (error) return { error: t.chats.sendError };

  const { data: chat } = await supabase
    .from("chats")
    .select("user_a, user_b, site_id, sites(name)")
    .eq("id", input.chatId)
    .maybeSingle();

  if (chat?.site_id) {
    // Чат объекта: сообщение уходит всем остальным сотрудникам, в заголовке видно объект.
    const name = siteSender(profile.full_name, chat.sites?.name);
    const recipients = await siteChatRecipients(supabase, profile.id);

    await Promise.all(
      recipients.map((userId) =>
        notifyUser(userId, "chatMessages", (locale) => ({
          ...chatPushText("message", locale, { name, text }),
          url: chatUrl(input.chatId),
          tag: `chat-${input.chatId}`,
        })),
      ),
    );
  } else if (chat) {
    const otherId = chat.user_a === profile.id ? chat.user_b : chat.user_a;

    if (otherId) {
      await notifyUser(otherId, "chatMessages", (locale) => ({
        ...chatPushText("message", locale, { name: profile.full_name, text }),
        url: chatUrl(input.chatId),
        tag: `chat-${input.chatId}`,
      }));
    }
  }

  return { error: null };
}

export type DeleteCardState = { error: string | null };

/**
 * Удаляет карточку чеклиста из чата (у обоих участников). Если копия чеклиста принадлежит удаляющему
 * (он получатель), она удаляется тоже: чеклист исчезает и из его списка. Копию коллеги отправитель не трогает.
 */
export async function deleteChatChecklist(messageId: string): Promise<DeleteCardState> {
  const t = await getT();
  const profile = await getProfile();
  if (!profile) return { error: t.auth.noProfile };

  const supabase = await createClient();

  // Доступ решает база: RLS показывает сообщение только двум участникам чата. Видно — значит, удалять можно.
  const { data: message } = await supabase
    .from("chat_messages")
    .select("id, checklist_id, sender_id, chats(site_id)")
    .eq("id", messageId)
    .eq("kind", "checklist")
    .maybeSingle();
  if (!message) return { error: t.chats.card.deleteError };

  // В чате объекта карточку убирает автор или шеф (видят её все сотрудники); сам чеклист автора остаётся в его списке.
  const inSiteChat = Boolean(message.chats?.site_id);
  if (inSiteChat && message.sender_id !== profile.id && profile.role !== "boss") return { error: t.chats.card.deleteError };

  // Сама карточка удаляется сервисным ключом: обычной политики на удаление сообщений нет (текст не удаляется никогда).
  // Сначала карточка: если не вышло, копию не трогаем.
  const { data: removed, error } = await createAdminClient()
    .from("chat_messages")
    .delete()
    .eq("id", message.id)
    .eq("kind", "checklist")
    .select("id");
  if (error || !removed || removed.length === 0) return { error: t.chats.card.deleteError };

  if (message.checklist_id && !inSiteChat) {
    // Удалится, только если копия моя (RLS и условие по владельцу); чужую копию эта команда не заденет.
    await supabase.from("checklists").delete().eq("id", message.checklist_id).eq("owner_id", profile.id);
  }

  revalidatePath("/chats");
  revalidatePath("/checklists");
  revalidatePath("/");

  return { error: null };
}

export type ChatActionState = { error: string | null };

/**
 * Кладёт свой чеклист в чат объекта: один общий чеклист, не копии. Саму карточку и права проверяет база
 * (чеклист должен быть мой, чат — объекта, в который я допущен), затем остальным сотрудникам уходит push.
 */
export async function postChecklistToChat(checklistId: string, chatId: string): Promise<ChatActionState> {
  const t = await getT();
  const profile = await getProfile();
  if (!profile) return { error: t.auth.noProfile };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("post_checklist_to_site_chat", { p_checklist: checklistId, p_chat: chatId });
  if (error || !data) return { error: t.chats.attach.sendError };

  const [{ data: chat }, { data: list }, recipients] = await Promise.all([
    supabase.from("chats").select("sites(name)").eq("id", chatId).maybeSingle(),
    supabase.from("checklists").select("title, checklist_items(id)").eq("id", checklistId).maybeSingle(),
    siteChatRecipients(supabase, profile.id),
  ]);

  const name = siteSender(profile.full_name, chat?.sites?.name);
  const title = list?.title ?? "";
  const total = list?.checklist_items.length ?? 0;

  // Push ждём до конца: на serverless-хостинге функция завершается вместе с ответом.
  await Promise.all(
    recipients.map((userId) =>
      notifyUser(userId, "chatChecklists", (locale) => ({
        ...chatPushText("checklist", locale, { name, title, total }),
        url: chatUrl(chatId),
        tag: `chat-${chatId}`,
      })),
    ),
  );

  revalidatePath("/chats");

  return { error: null };
}

/** Очищает чат у того, кто нажал: старые сообщения он больше не видит, у остальных они остаются. */
export async function clearChat(chatId: string): Promise<ChatActionState> {
  const t = await getT();
  const profile = await getProfile();
  if (!profile) return { error: t.auth.noProfile };

  const supabase = await createClient();
  const { error } = await supabase.rpc("clear_chat", { p_chat: chatId });
  if (error) return { error: t.chats.clearChat.error };

  revalidatePath("/chats");

  return { error: null };
}

/**
 * Удаляет чат 1 на 1 у обоих участников вместе с перепиской. Чат объекта и чужой чат база не удаляет
 * (политика пускает только участника пары), тогда нет ни одной удалённой строки — это ошибка.
 */
export async function deleteChat(chatId: string): Promise<ChatActionState> {
  const t = await getT();
  const profile = await getProfile();
  if (!profile) return { error: t.auth.noProfile };

  const supabase = await createClient();
  const { data, error } = await supabase.from("chats").delete().eq("id", chatId).select("id");
  if (error || !data || data.length === 0) return { error: t.chats.deleteChat.error };

  revalidatePath("/chats");

  return { error: null };
}
