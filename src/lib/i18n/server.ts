import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { getDictionary } from "./dictionaries";
import type { Dict } from "./index";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./locales";

/** Язык текущего запроса — из куки; без куки или с чужим значением — украинский. */
export const getLocale = cache(async (): Promise<Locale> => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;

  return isLocale(value) ? value : DEFAULT_LOCALE;
});

/** Словарь текущего запроса: `const t = await getT();` в серверных компонентах и экшенах. */
export async function getT(): Promise<Dict> {
  return getDictionary(await getLocale());
}
