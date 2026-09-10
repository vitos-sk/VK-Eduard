"use server";

import { revalidatePath } from "next/cache";

import { t } from "@/lib/i18n";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types.gen";
import { getProfile } from "@/modules/auth/session";

type UserRole = Database["public"]["Enums"]["user_role"];

export type CreateWorkerState =
  | { error: string; tempPassword?: undefined; email?: undefined }
  | { error: null; tempPassword: string; email: string };

const TEMP_PASSWORD_ALPHABET =
  "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Читаемый временный пароль без похожих символов (0/O, 1/l) — его диктуют вслух. */
function generateTempPassword(length = 10): string {
  let result = "";

  for (let i = 0; i < length; i++) {
    result += TEMP_PASSWORD_ALPHABET[Math.floor(Math.random() * TEMP_PASSWORD_ALPHABET.length)];
  }

  return result;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Заводить співробітника — тільки boss. Адмінський клієнт (сервісний ключ)
 * обходить RLS повністю, тож перевірку ролі виконуємо самі, тут-таки,
 * а не покладаємось на базу — на відміну від решти дій у проєкті.
 *
 * Запрошень/листів немає (ROADMAP.md, етап 2 і 6: «людей заводить шеф
 * руками»): пароль генерується одразу і повертається один раз, шеф
 * передає його співробітнику сам — так само, як зараз демо-акаунти
 * в `seed.sql`.
 */
export async function createWorker(input: {
  fullName: string;
  email: string;
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

  const admin = createAdminClient();
  const tempPassword = generateTempPassword();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
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

  return { error: null, tempPassword, email };
}
