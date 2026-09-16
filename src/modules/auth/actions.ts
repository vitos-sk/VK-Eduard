"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { t } from "@/lib/i18n";
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

  const profile = await getProfile();

  // redirect бросает исключение — он должен быть вне try/catch. Редирект
  // на адмінку — тільки одразу після входу; подальші заходи на "/" шефа
  // туди більше не відкидають, він може вільно ходити застосунком.
  if (profile?.role === "boss" && profile.default_view === "admin") {
    redirect("/more/admin");
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

export type UpdateDefaultViewState = { error: string | null };

type DefaultView = "app" | "admin";

/**
 * Перемикає, що відкривати одразу після входу — тільки для `boss`
 * (сегмент-контрол на `/more/admin`). Для `worker` поле існує в базі, але
 * ніде не читається — `signIn` перевіряє його тільки для `role === "boss"`.
 */
export async function updateDefaultView(view: DefaultView): Promise<UpdateDefaultViewState> {
  const profile = await getProfile();

  if (!profile || profile.role !== "boss") {
    return { error: t.auth.noProfile };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ default_view: view })
    .eq("id", profile.id);

  if (error) {
    return { error: t.profile.saveError };
  }

  revalidatePath("/more/admin");

  return { error: null };
}
