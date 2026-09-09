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

/**
 * Все объекты компании, включая архивные — для списка «Об'єкти» и подписи
 * названия в истории записей. Архивный объект пропадает из выбора при
 * создании новой записи, но не должен пропадать из уже случившейся истории.
 */
export async function getAllSites(
  supabase: SupabaseClient<Database>,
): Promise<Site[]> {
  const { data, error } = await supabase
    .from("sites")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;

  return data ?? [];
}

/** Один объект по id — для детальной страницы `/objects/[id]`. */
export async function getSiteById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Site | null> {
  const { data, error } = await supabase
    .from("sites")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return data;
}
