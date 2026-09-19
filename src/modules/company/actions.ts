"use server";

import { revalidatePath } from "next/cache";

import { t } from "@/lib/i18n";
import { companyStrings } from "@/lib/i18n/parts/company";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/modules/auth/session";

export type UpdateCompanyDailyNormState = { error: string | null };

const MIN_DAILY_NORM_MINUTES = 60;
const MAX_DAILY_NORM_MINUTES = 1440;

/**
 * Змінює денну норму годин компанії за замовчуванням (`companies.daily_norm_minutes`) —
 * тільки boss, розділ «Налаштування» адмінки (`/more/company`). Значення
 * використовується як стартове для нових співробітників (`profiles.daily_norm_minutes`
 * задається при заведенні) і як дефолт там, де власної норми ще нема.
 *
 * RLS (`companies_update`) пускає тільки `is_boss()` свого company_id — та сама
 * розвилка з кодом `42501`, що й у `sites`/`reports` діях, але перевірку ролі
 * робимо ще й тут-таки, до запиту: єдиний бар'єр не мусить триматись тільки на
 * коді помилки бази.
 */
export async function updateCompanyDailyNorm(minutes: number): Promise<UpdateCompanyDailyNormState> {
  const profile = await getProfile();

  if (!profile || profile.role !== "boss") {
    return { error: t.auth.noProfile };
  }

  if (
    !Number.isFinite(minutes) ||
    minutes < MIN_DAILY_NORM_MINUTES ||
    minutes > MAX_DAILY_NORM_MINUTES
  ) {
    return { error: companyStrings.settings.dailyNormInvalid };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({ daily_norm_minutes: Math.round(minutes) })
    .eq("id", profile.company_id);

  if (error) {
    return { error: companyStrings.settings.dailyNormSaveError };
  }

  revalidatePath("/more/company");

  return { error: null };
}
