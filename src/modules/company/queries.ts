import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types.gen";
import type { Company } from "./types";

type Client = SupabaseClient<Database>;

/** Компанія за id — поки що тільки для читання `daily_norm_minutes` у «Налаштуваннях» адмінки. */
export async function getCompany(supabase: Client, companyId: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .maybeSingle();

  if (error) throw error;

  return data;
}
