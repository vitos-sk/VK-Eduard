import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types.gen";
import type { WorkEntry } from "./types";

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
