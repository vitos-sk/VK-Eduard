"use server";

import { revalidatePath } from "next/cache";

import { fmt } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/modules/auth/session";
import { findChatId } from "@/modules/chats/queries";
import { chatPushText, chatUrl } from "@/modules/chats/texts";
import { notifyUser } from "@/modules/notifications/notify";

import { ITEMS_MAX, validateDraft, type ChecklistDraft, type DraftItem } from "./draft";
import { countProgress, isComplete } from "./progress";
import { isShareToken } from "./token";

export interface SaveChecklistInput {
  title: string;
  siteId: string | null;
  items: DraftItem[];
}

/** `itemIds` — id сохранённых пунктов в порядке списка: форма запоминает их, чтобы следующее автосохранение правило те же пункты. */
export type SaveChecklistState = { error: string | null; id: string | null; itemIds: string[] };
export type SimpleState = { error: string | null };

type Texts = Awaited<ReturnType<typeof getT>>;
type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** Id пунктов чеклиста в порядке списка (`sort_order`). */
async function orderedItemIds(supabase: ServerClient, checklistId: string): Promise<string[]> {
  const { data } = await supabase.from("checklist_items").select("id").eq("checklist_id", checklistId).order("sort_order", { ascending: true });

  return (data ?? []).map((row) => row.id);
}

/** Проверка формы + понятное сообщение об ошибке на языке интерфейса. */
function checkDraft(input: SaveChecklistInput, t: Texts): { draft: ChecklistDraft } | { error: string } {
  const result = validateDraft({ title: input.title, items: input.items });
  if (result.ok) return { draft: result.draft };

  const errors = t.checklists.form.errors;

  return {
    error: result.reason === "title" ? errors.title : result.reason === "items" ? errors.items : fmt(errors.tooMany, { n: ITEMS_MAX }),
  };
}

/** Создаёт свой чеклист. Копии для коллег создаёт только `sendChecklist`. */
export async function createChecklist(input: SaveChecklistInput): Promise<SaveChecklistState> {
  const t = await getT();
  const profile = await getProfile();
  if (!profile) return { error: t.auth.noProfile, id: null, itemIds: [] };

  const checked = checkDraft(input, t);
  if ("error" in checked) return { error: checked.error, id: null, itemIds: [] };

  const supabase = await createClient();
  const { data: list, error } = await supabase
    .from("checklists")
    .insert({ company_id: profile.company_id, owner_id: profile.id, title: checked.draft.title, site_id: input.siteId })
    .select("id")
    .single();

  if (error || !list) return { error: t.checklists.form.errors.save, id: null, itemIds: [] };

  const { error: itemsError } = await supabase
    .from("checklist_items")
    .insert(checked.draft.items.map((item, index) => ({ checklist_id: list.id, text: item.text, sort_order: index })));

  if (itemsError) {
    // Без пунктов чеклист бессмысленен, а повторное «Зберегти» создало бы второй: убираем заготовку.
    await supabase.from("checklists").delete().eq("id", list.id);

    return { error: t.checklists.form.errors.save, id: null, itemIds: [] };
  }

  revalidatePath("/checklists");
  revalidatePath("/");

  return { error: null, id: list.id, itemIds: await orderedItemIds(supabase, list.id) };
}

/**
 * Правит свой чеклист: название, объект, пункты. Уже отмеченные пункты остаются отмеченными.
 * Присланную копию править нельзя (она хранит то, что прислал коллега).
 */
export async function updateChecklist(id: string, input: SaveChecklistInput): Promise<SaveChecklistState> {
  const t = await getT();
  const profile = await getProfile();
  if (!profile) return { error: t.auth.noProfile, id: null, itemIds: [] };

  const checked = checkDraft(input, t);
  if ("error" in checked) return { error: checked.error, id: null, itemIds: [] };

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("checklists")
    .update({ title: checked.draft.title, site_id: input.siteId })
    .eq("id", id)
    .eq("owner_id", profile.id)
    .is("origin_id", null)
    .select("id")
    .maybeSingle();

  if (error) return { error: t.checklists.form.errors.save, id: null, itemIds: [] };
  if (!updated) return { error: t.checklists.form.errors.notFound, id: null, itemIds: [] };

  const { data: existing, error: existingError } = await supabase.from("checklist_items").select("id").eq("checklist_id", id);
  if (existingError) return { error: t.checklists.form.errors.save, id: null, itemIds: [] };

  const existingIds = new Set((existing ?? []).map((row) => row.id));
  const kept = checked.draft.items.map((item, index) => ({ item, index })).filter(({ item }) => item.id !== null && existingIds.has(item.id));
  const added = checked.draft.items.map((item, index) => ({ item, index })).filter(({ item }) => item.id === null || !existingIds.has(item.id));
  const keptIds = new Set(kept.map(({ item }) => item.id));
  const removed = [...existingIds].filter((itemId) => !keptIds.has(itemId));

  if (removed.length > 0) {
    const { error: deleteError } = await supabase.from("checklist_items").delete().in("id", removed);
    if (deleteError) return { error: t.checklists.form.errors.save, id: null, itemIds: [] };
  }

  if (kept.length > 0) {
    // Колонку `done_at` не передаём: при совпадении id она остаётся как была.
    const { error: upsertError } = await supabase
      .from("checklist_items")
      .upsert(kept.map(({ item, index }) => ({ id: item.id as string, checklist_id: id, text: item.text, sort_order: index })), { onConflict: "id" });
    if (upsertError) return { error: t.checklists.form.errors.save, id: null, itemIds: [] };
  }

  if (added.length > 0) {
    const { error: insertError } = await supabase
      .from("checklist_items")
      .insert(added.map(({ item, index }) => ({ checklist_id: id, text: item.text, sort_order: index })));
    if (insertError) return { error: t.checklists.form.errors.save, id: null, itemIds: [] };
  }

  revalidatePath("/checklists");
  revalidatePath(`/checklists/${id}`);

  return { error: null, id, itemIds: await orderedItemIds(supabase, id) };
}

/** Удаляет свой чеклист (или свою копию). Копии, разосланные коллегам, остаются у них. */
export async function deleteChecklist(id: string): Promise<SimpleState> {
  const t = await getT();
  const profile = await getProfile();
  if (!profile) return { error: t.auth.noProfile };

  const supabase = await createClient();
  const { data, error } = await supabase.from("checklists").delete().eq("id", id).eq("owner_id", profile.id).select("id");

  if (error || !data || data.length === 0) return { error: t.checklists.view.deleteError };

  revalidatePath("/checklists");
  revalidatePath("/");

  return { error: null };
}

export type ToggleState = { error: string | null; done: number; total: number };

/**
 * Отмечает или снимает пункт. Отмечать могут оба участника чата, где лежит карточка чеклиста: владелец копии
 * и тот, кто её прислал. Когда владелец отметил последний пункт присланного чеклиста, приславшему уходит
 * уведомление «чеклист виконано» (если отметил приславший, уведомлять некого).
 */
export async function setItemDone(itemId: string, done: boolean): Promise<ToggleState> {
  const t = await getT();
  const failed: ToggleState = { error: t.checklists.view.toggleError, done: 0, total: 0 };

  const profile = await getProfile();
  if (!profile) return failed;

  const supabase = await createClient();

  // Свой пункт: обычное обновление (RLS пускает только владельца).
  const { data: own, error } = await supabase
    .from("checklist_items")
    .update({ done_at: done ? new Date().toISOString() : null })
    .eq("id", itemId)
    .select("checklist_id")
    .maybeSingle();
  if (error) return failed;

  let checklistId = own?.checklist_id ?? null;

  // Не владелец (отправитель отмечает пункт копии коллеги в чате). Доступ решает база: RLS показывает пункт только
  // владельцу и участнику чата, где лежит карточка этого чеклиста. Если пункт виден, меняем ровно одну колонку
  // `done_at` этого пункта сервисным ключом (обычная политика записи пускает только владельца).
  if (!checklistId) {
    const { data: visible, error: visibleError } = await supabase
      .from("checklist_items")
      .select("id, checklist_id")
      .eq("id", itemId)
      .maybeSingle();
    if (visibleError || !visible) return failed;

    const { error: adminError } = await createAdminClient()
      .from("checklist_items")
      .update({ done_at: done ? new Date().toISOString() : null })
      .eq("id", visible.id);
    if (adminError) return failed;

    checklistId = visible.checklist_id;
  }

  const { data: list, error: listError } = await supabase
    .from("checklists")
    .select("id, title, owner_id, sent_by, checklist_items(done_at)")
    .eq("id", checklistId)
    .maybeSingle();
  if (listError || !list) return failed;

  const progress = countProgress(list.checklist_items);

  if (done && isComplete(progress) && list.sent_by && list.owner_id === profile.id) {
    const senderId = list.sent_by;
    const chatId = await findChatId(supabase, profile.id, senderId).catch(() => null);

    await notifyUser(senderId, "checklistDone", (locale) => ({
      ...chatPushText("done", locale, { name: profile.full_name, title: list.title, done: progress.done, total: progress.total }),
      url: chatId ? chatUrl(chatId) : `/checklists/${list.id}`,
      tag: `checklist-done-${list.id}`,
    }));
  }

  revalidatePath("/checklists");
  revalidatePath("/");

  return { error: null, ...progress };
}

export type SendChecklistState =
  | { error: string; chats: [] }
  | { error: null; chats: { recipientId: string; chatId: string }[] };

/** Отправляет свой чеклист коллегам в чат: каждому своя копия и карточка в чате с ним, затем push. */
export async function sendChecklist(checklistId: string, recipientIds: string[]): Promise<SendChecklistState> {
  const t = await getT();
  const profile = await getProfile();
  if (!profile) return { error: t.auth.noProfile, chats: [] };

  const supabase = await createClient();
  const { data: source } = await supabase
    .from("checklists")
    .select("title, checklist_items(id)")
    .eq("id", checklistId)
    .eq("owner_id", profile.id)
    .maybeSingle();

  if (!source) return { error: t.checklists.form.errors.notFound, chats: [] };

  const { data, error } = await supabase.rpc("send_checklist", { p_checklist: checklistId, p_recipients: recipientIds });
  if (error || !data) return { error: t.checklists.send.error, chats: [] };

  // Push ждём до конца: на serverless-хостинге функция завершается вместе с ответом.
  await Promise.all(
    data.map((row) =>
      notifyUser(row.out_recipient, "chatChecklists", (locale) => ({
        ...chatPushText("checklist", locale, { name: profile.full_name, title: source.title, total: source.checklist_items.length }),
        url: chatUrl(row.out_chat),
        tag: `chat-${row.out_chat}`,
      })),
    ),
  );

  revalidatePath("/checklists");
  revalidatePath("/chats");

  return { error: null, chats: data.map((row) => ({ recipientId: row.out_recipient, chatId: row.out_chat })) };
}

export type AcceptState = { error: string; copyId: null } | { error: null; copyId: string };

/** «Додати собі» по ссылке из WhatsApp: своя копия, чат с автором и карточка в нём. Повторное нажатие даёт ту же копию. */
export async function acceptChecklist(token: string): Promise<AcceptState> {
  const t = await getT();
  const profile = await getProfile();
  if (!profile) return { error: t.auth.noProfile, copyId: null };
  if (!isShareToken(token)) return { error: t.checklists.landing.error, copyId: null };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_checklist", { p_token: token });
  const row = data?.[0];

  if (error || !row) return { error: t.checklists.landing.error, copyId: null };

  revalidatePath("/checklists");
  revalidatePath("/chats");
  revalidatePath("/");

  return { error: null, copyId: row.out_copy };
}
