import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "@/lib/supabase/types.gen";

export type Site = Tables<"sites">;

/**
 * Активные объекты компании — для выпадашки выбора в форме записи времени.
 * Архивные (`archived_at` задан) сюда не попадают: закрытый объект незачем
 * предлагать для новой записи, история по нему остаётся доступной напрямую.
 */
export async function getActiveSites(
  supabase: SupabaseClient<Database>,
): Promise<Site[]> {
  const { data, error } = await supabase
    .from("sites")
    .select("*")
    .is("archived_at", null)
    .order("name", { ascending: true });

  if (error) throw error;

  return data ?? [];
}
