"use server";

import { revalidatePath } from "next/cache";

import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/modules/auth/session";

export type TravelActionState = { error: string | null };

/** Удаляет запись дороги. Права решает RLS: своя запись — рабочему, любая в компании — шефу. */
export async function deleteTravelEntry(entryId: string): Promise<TravelActionState> {
  const t = await getT();
  const profile = await getProfile();

  if (!profile) {
    return { error: t.auth.noProfile };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("travel_entries").delete().eq("id", entryId).select("id");

  if (error) {
    return { error: t.travel.deleteError };
  }

  if (!data || data.length === 0) {
    return { error: t.reportDetail.saveRejected };
  }

  revalidatePath("/", "layout");

  return { error: null };
}
