"use server";

import { cookies } from "next/headers";

import { isLocale, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from "./locales";

/** Запоминает язык на устройстве. Кука меняется — Next сам перерисовывает страницу на новом языке. */
export async function setLocale(value: string): Promise<{ ok: boolean }> {
  if (!isLocale(value)) {
    return { ok: false };
  }

  (await cookies()).set(LOCALE_COOKIE, value, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });

  return { ok: true };
}
