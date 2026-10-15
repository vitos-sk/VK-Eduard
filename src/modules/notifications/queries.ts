import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types.gen";

import { prefsFromRow, type NotificationPrefs } from "./prefs";

/** Свои настройки уведомлений; нет строки — всё включено. */
export async function getMyPrefs(supabase: SupabaseClient<Database>, userId: string): Promise<NotificationPrefs> {
  const { data, error } = await supabase.from("notification_prefs").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;

  return prefsFromRow(data);
}
