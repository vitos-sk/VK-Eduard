import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "@/lib/supabase/types.gen";

type Client = SupabaseClient<Database>;

export type TravelEntry = Tables<"travel_entries">;

/** Поездка с именами автора и объекта — строка блока «Дорога» на экране «Години». */
export interface TravelEntryWithNames extends TravelEntry {
  author_full_name: string;
  site_name: string | null;
}

type Row = TravelEntry & {
  profiles: { full_name: string } | null;
  sites: { name: string } | null;
};

/** Коды «таблицы нет» (миграция 0018 ещё не накатана): Postgres и PostgREST. */
const MISSING_TABLE_CODES = new Set(["42P01", "PGRST205"]);

/**
 * Поездки за диапазон дат (RLS: рабочему — свои, шефу — вся компания). Если таблицы ещё нет —
 * пустой список, а не ошибка: экран «Години» без неё работает как раньше.
 */
export async function getTravelEntriesInRange(
  supabase: Client,
  companyId: string,
  fromDate: string,
  toDate: string,
): Promise<TravelEntryWithNames[]> {
  const { data, error } = await supabase
    .from("travel_entries")
    .select("*, profiles(full_name), sites(name)")
    .eq("company_id", companyId)
    .gte("work_date", fromDate)
    .lte("work_date", toDate)
    .order("work_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    if (error.code && MISSING_TABLE_CODES.has(error.code)) return [];
    throw error;
  }

  return ((data ?? []) as Row[]).map(({ profiles, sites, ...entry }) => ({
    ...entry,
    author_full_name: profiles?.full_name ?? "",
    site_name: sites?.name ?? null,
  }));
}
