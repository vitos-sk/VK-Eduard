import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types.gen";

export type Profile = Tables<"profiles">;

/**
 * Профиль вошедшего или `null`. Только для сервера.
 *
 * `cache` — чтобы шапка, экран и layout в одном рендере не сделали три
 * одинаковых запроса. Живёт ровно один запрос, между пользователями не течёт.
 */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();

  // getUser(), а не getSession(): токен проверяется на сервере Supabase.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data;
});

/**
 * Профиль или редирект — для экранов за логином, где `null` бессмыслен.
 * Неавторизованного до сюда не пускает `proxy.ts`; это второй рубеж
 * на случай, если пользователь есть в auth, а профиля в базе нет.
 */
export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();

  if (!profile) {
    redirect("/welcome");
  }

  return profile;
}

/** Первая буква имени для кружка-аватара. */
export function initialsOf(profile: Pick<Profile, "full_name">): string {
  return profile.full_name.trim().charAt(0).toUpperCase();
}
