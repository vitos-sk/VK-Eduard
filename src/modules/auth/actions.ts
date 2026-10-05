"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/modules/auth/session";

export type SignInState = { error: string | null };

/**
 * Вход по email и паролю. Регистрации нет — людей заводит шеф.
 *
 * Причину ошибки наружу не показываем: различие «немає такого email» и
 * «невірний пароль» позволяет перебирать чужие адреса.
 */
export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const t = await getT();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: t.auth.failed };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: t.auth.failed };
  }

  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/welcome");
}

export type UpdateNameState = { error: string | null };

/** Правит своё имя в `profiles` — каждый может изменить только себя. */
export async function updateFullName(
  _prev: UpdateNameState,
  formData: FormData,
): Promise<UpdateNameState> {
  const t = await getT();
  const fullName = String(formData.get("fullName") ?? "").trim();

  if (fullName === "") {
    return { error: t.profile.nameRequired };
  }

  const profile = await getProfile();

  if (!profile) {
    return { error: t.auth.noProfile };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", profile.id);

  if (error) {
    return { error: t.profile.saveError };
  }

  revalidatePath("/more");
  redirect("/more");
}

export type ForgotPasswordState = { status: "idle" | "sent" | "error"; error: string | null };

/** Сколько ждём ответа почтового сервера, прежде чем сообщить, что отправка затянулась. */
const RESET_TIMEOUT_MS = 12_000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Адрес сайта, с которого пришёл запрос: ссылка в письме должна вести обратно именно сюда. */
async function requestOrigin(): Promise<string> {
  const list = await headers();
  const origin = list.get("origin");

  if (origin) return origin;

  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "localhost:3000";
  const protocol = list.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
}

/**
 * Шлёт на email ссылку для нового пароля. Ответ один и тот же, есть такой адрес в системе или нет:
 * иначе по реакции формы можно было бы перебирать чужие адреса (как и в `signIn`).
 * Письмо отправляет сам Supabase Auth; ссылка ведёт на `/auth/callback`, оттуда — на `/reset-password`.
 */
export async function requestPasswordReset(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const t = await getT();
  const email = String(formData.get("email") ?? "").trim();

  if (!EMAIL_PATTERN.test(email)) {
    return { status: "error", error: t.auth.forgotInvalidEmail };
  }

  const supabase = await createClient();
  const redirectTo = `${await requestOrigin()}/auth/callback?next=/reset-password`;

  // Письмо уходит через почтовый сервер синхронно: при неверных настройках SMTP запрос может висеть
  // десятки секунд. Ждём не дольше 12 с и честно говорим, что отправка затянулась.
  const result = await Promise.race([
    supabase.auth.resetPasswordForEmail(email, { redirectTo }),
    new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), RESET_TIMEOUT_MS)),
  ]);

  if (result === "timeout") {
    return { status: "error", error: t.auth.forgotSlow };
  }

  const { error } = result;

  if (error) {
    if (error.status === 429 || error.code === "over_email_send_rate_limit") {
      return { status: "error", error: t.auth.forgotRateLimit };
    }

    // Нет связи с Supabase и т.п. Остальные отказы (например, нет такого пользователя)
    // не показываем — иначе форма выдаёт, какие адреса зарегистрированы.
    if (error.status === undefined || error.status >= 500) {
      return { status: "error", error: t.auth.forgotFailed };
    }
  }

  return { status: "sent", error: null };
}

export type ResetPasswordState = { error: string | null };

/** Минимальная длина пароля — как в форме «Додати співробітника» и как у Supabase по умолчанию. */
const MIN_PASSWORD_LENGTH = 6;

/** Задаёт новый пароль. Работает только для вошедшего — после перехода по ссылке из письма сессия уже есть. */
export async function updatePassword(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const t = await getT();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: t.auth.passwordTooShort };
  }

  if (password !== confirm) {
    return { error: t.auth.passwordMismatch };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t.auth.linkInvalid };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.code === "same_password" ? t.auth.passwordSame : t.auth.resetFailed };
  }

  redirect("/");
}
