"use server";

import { createClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/lib/supabase/types.gen";
import { getProfile } from "@/modules/auth/session";

import { PREF_COLUMNS, isPrefKey, type PrefKey } from "./prefs";

export type SavePrefResult = { ok: true } | { ok: false };

/** Включает или выключает один вид уведомлений для себя. Остальные настройки не трогаются. */
export async function saveNotificationPref(key: PrefKey, value: boolean): Promise<SavePrefResult> {
  const profile = await getProfile();
  if (!profile || !isPrefKey(key) || typeof value !== "boolean") return { ok: false };

  const row: TablesInsert<"notification_prefs"> = { user_id: profile.id };
  row[PREF_COLUMNS[key]] = value;

  const supabase = await createClient();
  const { error } = await supabase.from("notification_prefs").upsert(row, { onConflict: "user_id" });

  return error ? { ok: false } : { ok: true };
}
