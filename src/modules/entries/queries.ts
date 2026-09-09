import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types.gen";
import type { WorkEntry, WorkEntryWithPhotos } from "./types";

type Client = SupabaseClient<Database>;

/**
 * Читающие запросы к `work_entries`. Принимают клиент, а не создают его сами —
 * работают одинаково с серверным клиентом (первичная загрузка страницы)
 * и с браузерным (переключение периода без похода на сервер).
 *
 * RLS сам ограничивает видимость: рабочему передавать `authorId` кого-то
 * другого бессмысленно — база всё равно отдаст только его записи или пусто.
 */

/** Открытая смена автора. Больше одной быть не может — частичный уникальный индекс. */
export async function getOpenEntry(
  supabase: Client,
  authorId: string,
): Promise<WorkEntry | null> {
  const { data, error } = await supabase
    .from("work_entries")
    .select("*")
    .eq("author_id", authorId)
    .is("ended_at", null)
    .maybeSingle();

  if (error) throw error;

  return data;
}

/** Все записи автора за один день работы, от ранней к поздней. */
export async function getEntriesForDate(
  supabase: Client,
  authorId: string,
  workDate: string,
): Promise<WorkEntry[]> {
  const { data, error } = await supabase
    .from("work_entries")
    .select("*")
    .eq("author_id", authorId)
    .eq("work_date", workDate)
    .order("started_at", { ascending: true });

  if (error) throw error;

  return data ?? [];
}

/**
 * Лента «Звіти»: записи автора вместе с их фото, от новых к старым.
 * Фильтры (Усі / Без опису / З фото), поиск и группировка по датам —
 * на клиенте, поверх этого одного запроса: масштаб компании (десятки
 * человек) не требует серверной пагинации на этом этапе.
 */
export async function getEntriesFeed(
  supabase: Client,
  authorId: string,
): Promise<WorkEntryWithPhotos[]> {
  const { data, error } = await supabase
    .from("work_entries")
    .select("*, entry_photos(*)")
    .eq("author_id", authorId)
    .order("work_date", { ascending: false })
    .order("started_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as WorkEntryWithPhotos[];
}

/** Одна запись с фото — для детальной страницы `/reports/[id]`. */
export async function getEntryWithPhotos(
  supabase: Client,
  entryId: string,
): Promise<WorkEntryWithPhotos | null> {
  const { data, error } = await supabase
    .from("work_entries")
    .select("*, entry_photos(*)")
    .eq("id", entryId)
    .maybeSingle();

  if (error) throw error;

  return data as WorkEntryWithPhotos | null;
}

/** Записи автора в диапазоне дат включительно — для сводок «Тиждень» / «Місяць». */
export async function getEntriesInRange(
  supabase: Client,
  authorId: string,
  fromDate: string,
  toDate: string,
): Promise<WorkEntry[]> {
  const { data, error } = await supabase
    .from("work_entries")
    .select("*")
    .eq("author_id", authorId)
    .gte("work_date", fromDate)
    .lte("work_date", toDate)
    .order("work_date", { ascending: true })
    .order("started_at", { ascending: true });

  if (error) throw error;

  return data ?? [];
}
