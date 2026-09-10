import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "@/lib/supabase/types.gen";

export type Worker = Tables<"profiles">;

/**
 * Активные сотрудники компании — вкладка «Команда» на екрані «Звіти»
 * (тільки boss). RLS (`profiles_select`) сама обмежує вибірку своєю
 * компанією, тут лишається тільки прибрати звільнених.
 */
export async function getCompanyWorkers(
  supabase: SupabaseClient<Database>,
  companyId: string,
): Promise<Worker[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (error) throw error;

  return data ?? [];
}
