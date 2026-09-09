import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types.gen";

export type Profile = Tables<"profiles">;

/**
 * Профиль вошедшего или `null`. Только для сервера.
 *
 * `cache` — чтобы шапка, экран и layout в одном рендере не сделали три
 * одинаковых запроса. Живёт ровно один запрос, между пользователями не течёт.
 *
 * Id пользователя берём из заголовка `x-user-id`, который `proxy.ts` уже
 * поставил после своего getUser() на этом же запросе — второй сетевой
 * поход в Supabase Auth за той же проверкой только удлинял каждый переход
 * между вкладками. Резервный getUser() остаётся на случай запроса, до
 * которого proxy.ts не дошёл (matcher его не покрывает).
 */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();

  let userId = (await headers()).get("x-user-id");

  if (!userId) {
    // getUser(), а не getSession(): токен проверяется на сервере Supabase.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    userId = user?.id ?? null;
  }

  if (!userId) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
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
