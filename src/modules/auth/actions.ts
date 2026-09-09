"use server";

import { redirect } from "next/navigation";

import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

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

  // redirect бросает исключение — он должен быть вне try/catch.
  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/welcome");
}
