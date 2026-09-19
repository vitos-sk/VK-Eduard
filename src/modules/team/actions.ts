"use server";

import { revalidatePath } from "next/cache";

import { t } from "@/lib/i18n";
import { companyStrings } from "@/lib/i18n/parts/company";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types.gen";
import { getProfile } from "@/modules/auth/session";

type UserRole = Database["public"]["Enums"]["user_role"];

export type CreateWorkerState =
  | { error: string; email?: undefined }
  | { error: null; email: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

/**
 * Заводить співробітника — тільки boss. Адмінський клієнт (сервісний ключ)
 * обходить RLS повністю, тож перевірку ролі виконуємо самі, тут-таки,
 * а не покладаємось на базу — на відміну від решти дій у проєкті.
 *
 * Запрошень/листів немає (ROADMAP.md, етап 2 і 6: «людей заводить шеф
 * руками»): пароль задає сам шеф у формі і передає його співробітнику —
 * так само, як зараз демо-акаунти в `seed.sql`. Самостійна зміна пароля
 * співробітником через email — окрема задача на майбутнє.
 */
export async function createWorker(input: {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}): Promise<CreateWorkerState> {
  const profile = await getProfile();

  if (!profile || profile.role !== "boss") {
    return { error: t.auth.noProfile };
  }

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();

  if (fullName === "") {
    return { error: t.reports.team.form.nameRequired };
  }

  if (!EMAIL_PATTERN.test(email)) {
    return { error: t.reports.team.form.emailInvalid };
  }

  if (input.password.length < MIN_PASSWORD_LENGTH) {
    return { error: t.reports.team.form.passwordTooShort };
  }

  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError || !created.user) {
    return {
      error:
        createError?.code === "email_exists"
          ? t.reports.team.form.emailTaken
          : t.reports.team.form.saveError,
    };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    company_id: profile.company_id,
    full_name: fullName,
    role: input.role,
    avatar_hue: Math.floor(Math.random() * 360),
  });

  if (profileError) {
    // Профіль не встав — обліковий запис без профілю нікому не потрібен
    // і зіпсує вхід (getProfile() поверне null для цього email назавжди).
    await admin.auth.admin.deleteUser(created.user.id);

    return { error: t.reports.team.form.saveError };
  }

  revalidatePath("/reports");

  return { error: null, email };
}

export type DeactivateWorkerState = { error: string | null };

/**
 * Деактивує співробітника — не `DELETE`: `work_entries.author_id` не має
 * `on delete`, тож видалення профілю з історією годин впало б по FK.
 * `is_active = false` ховає його з `getCompanyWorkers` і (разом із фільтром
 * у `getProfile()`) закриває вхід у застосунок, історія лишається як є.
 */
export async function setWorkerActive(
  workerId: string,
  active: boolean,
): Promise<DeactivateWorkerState> {
  const profile = await getProfile();

  if (!profile || profile.role !== "boss") {
    return { error: t.auth.noProfile };
  }

  if (workerId === profile.id) {
    return { error: t.reports.team.deactivateError };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ is_active: active })
    .eq("id", workerId)
    .eq("company_id", profile.company_id);

  if (error) {
    return { error: t.reports.team.deactivateError };
  }

  revalidatePath("/reports");

  return { error: null };
}

export type UpdateDailyNormState = { error: string | null };

const MIN_DAILY_NORM_MINUTES = 60;
const MAX_DAILY_NORM_MINUTES = 1440;

/**
 * Змінює денну норму годин співробітника (`profiles.daily_norm_minutes`) —
 * тільки boss, розділ «Команда» адмінки (`/more/team`). Той самий
 * патерн, що й `setWorkerActive`: адмінський клієнт обходить RLS повністю,
 * тож роль перевіряємо самі, тут-таки.
 */
export async function updateWorkerDailyNorm(
  workerId: string,
  minutes: number,
): Promise<UpdateDailyNormState> {
  const profile = await getProfile();

  if (!profile || profile.role !== "boss") {
    return { error: t.auth.noProfile };
  }

  if (
    !Number.isFinite(minutes) ||
    minutes < MIN_DAILY_NORM_MINUTES ||
    minutes > MAX_DAILY_NORM_MINUTES
  ) {
    return { error: companyStrings.team.dailyNormInvalid };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ daily_norm_minutes: Math.round(minutes) })
    .eq("id", workerId)
    .eq("company_id", profile.company_id);

  if (error) {
    return { error: companyStrings.team.dailyNormError };
  }

  revalidatePath("/more/team");
  // Змінена норма — не тільки адмінський список: сам працівник бачить своє
  // `profile.daily_norm_minutes` на «Годинах» (розрахунок місячної норми).
  revalidatePath("/hours");

  return { error: null };
}
