import { enGB, nl, uk } from "date-fns/locale";
import type { Locale as DateFnsLocale } from "date-fns/locale";

/** Языки интерфейса. Порядок — порядок в списке на странице «Мова». */
export const LOCALES = ["uk", "en", "nl"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "uk";

/** Кука с выбранным языком: живёт на устройстве, её читает и сервер, чтобы отрисовать страницу сразу на нужном языке. */
export const LOCALE_COOKIE = "locale";

/** Год — «запомнить на устройстве» без срока годности не бывает. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Название языка на нём самом — так его узнают, даже если интерфейс непонятен. */
export const LOCALE_NAMES: Record<Locale, string> = {
  uk: "Українська",
  en: "English",
  nl: "Nederlands",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Локали `date-fns` для названий дней и месяцев. Английский — британский: дата `30.07`, неделя с понедельника. */
export const DATE_FNS_LOCALES: Record<Locale, DateFnsLocale> = {
  uk,
  en: enGB,
  nl,
};

/** Теги для `Intl`/`toLocaleString` — разделители в числах и регистр. */
export const INTL_TAGS: Record<Locale, string> = {
  uk: "uk-UA",
  en: "en-GB",
  nl: "nl-NL",
};
