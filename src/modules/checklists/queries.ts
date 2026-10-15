import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types.gen";

import { countProgress, type Progress } from "./progress";

type Client = SupabaseClient<Database>;

/** Строка списка чеклистов: свои и присланные коллегами. */
export interface ChecklistListEntry {
  id: string;
  title: string;
  siteName: string | null;
  /** Кто прислал; у своего чеклиста — `null`. */
  senderName: string | null;
  isReceived: boolean;
  progress: Progress;
  /** Сколько копий разослано (только у своего чеклиста). */
  sentCount: number;
  createdAt: string;
}

export interface ChecklistItemView {
  id: string;
  text: string;
  doneAt: string | null;
}

export interface ChecklistDetail {
  id: string;
  title: string;
  siteId: string | null;
  siteName: string | null;
  ownerId: string;
  ownerName: string;
  senderName: string | null;
  isReceived: boolean;
  shareToken: string;
  items: ChecklistItemView[];
}

async function namesOf(supabase: Client, ids: readonly string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase.from("profiles").select("id, full_name").in("id", [...ids]);
  if (error) throw error;

  return new Map((data ?? []).map((row) => [row.id, row.full_name]));
}

async function siteNamesOf(supabase: Client, ids: readonly string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase.from("sites").select("id, name").in("id", [...ids]);
  if (error) throw error;

  return new Map((data ?? []).map((row) => [row.id, row.name]));
}

function unique<T>(values: readonly (T | null)[]): T[] {
  return [...new Set(values.filter((value): value is T => value !== null))];
}

/**
 * Чеклисты человека, новые сверху. Чужие копии, которые он видит через карточки в чатах (прогресс коллеги),
 * сюда не попадают: берём только те, где он владелец.
 */
export async function getMyChecklists(supabase: Client, userId: string): Promise<ChecklistListEntry[]> {
  const { data, error } = await supabase
    .from("checklists")
    .select("id, title, site_id, sent_by, origin_id, created_at, checklist_items(done_at)")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = data ?? [];
  const ownIds = rows.filter((row) => row.origin_id === null && row.sent_by === null).map((row) => row.id);

  const [sites, senders, copies] = await Promise.all([
    siteNamesOf(supabase, unique(rows.map((row) => row.site_id))),
    namesOf(supabase, unique(rows.map((row) => row.sent_by))),
    ownIds.length === 0
      ? Promise.resolve({ data: [] as { origin_id: string | null }[], error: null })
      : supabase.from("checklists").select("origin_id").in("origin_id", ownIds),
  ]);
  if (copies.error) throw copies.error;

  const sentCounts = new Map<string, number>();
  for (const copy of copies.data ?? []) {
    if (copy.origin_id) sentCounts.set(copy.origin_id, (sentCounts.get(copy.origin_id) ?? 0) + 1);
  }

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    siteName: row.site_id ? (sites.get(row.site_id) ?? null) : null,
    senderName: row.sent_by ? (senders.get(row.sent_by) ?? null) : null,
    isReceived: row.origin_id !== null || row.sent_by !== null,
    progress: countProgress(row.checklist_items),
    sentCount: sentCounts.get(row.id) ?? 0,
    createdAt: row.created_at,
  }));
}

/** Один чеклист с пунктами. Права решает RLS: свой — владельцу, копию коллеги видит и тот, кто её прислал. */
export async function getChecklist(supabase: Client, id: string): Promise<ChecklistDetail | null> {
  const { data, error } = await supabase
    .from("checklists")
    .select("*, checklist_items(id, text, sort_order, done_at)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const [people, sites] = await Promise.all([
    namesOf(supabase, unique([data.owner_id, data.sent_by])),
    siteNamesOf(supabase, unique([data.site_id])),
  ]);

  return {
    id: data.id,
    title: data.title,
    siteId: data.site_id,
    siteName: data.site_id ? (sites.get(data.site_id) ?? null) : null,
    ownerId: data.owner_id,
    ownerName: people.get(data.owner_id) ?? "",
    senderName: data.sent_by ? (people.get(data.sent_by) ?? null) : null,
    isReceived: data.origin_id !== null || data.sent_by !== null,
    shareToken: data.share_token,
    items: [...data.checklist_items]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => ({ id: item.id, text: item.text, doneAt: item.done_at })),
  };
}

/** Предпросмотр по ссылке из WhatsApp (`checklist_by_token`): только вошедшему сотруднику той же фирмы. */
export interface SharedChecklistPreview {
  id: string;
  ownerId: string;
  title: string;
  authorName: string;
  siteName: string | null;
  items: string[];
  /** Своя копия этого чеклиста, если человек уже добавлял его себе. */
  myCopyId: string | null;
}

export async function getChecklistByToken(supabase: Client, token: string): Promise<SharedChecklistPreview | null> {
  const { data, error } = await supabase.rpc("checklist_by_token", { p_token: token });
  if (error) throw error;

  const row = data?.[0];
  if (!row) return null;

  return {
    id: row.out_id,
    ownerId: row.out_owner,
    title: row.out_title,
    authorName: row.out_author,
    siteName: row.out_site,
    items: row.out_items,
    myCopyId: row.out_my_copy,
  };
}
