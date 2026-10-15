import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/locales";

/** Куда ведёт нажатие на уведомление. */
export const REMINDER_URL = "/reports/new";

/** Уведомление уходит с сервера, а не рисуется в приложении, поэтому тексты на трёх языках лежат здесь. */
const TEXTS: Record<Locale, { title: string; body: string }> = {
  uk: { title: "VK group", body: "Не забудьте створити звіт за сьогодні" },
  en: { title: "VK group", body: "Don't forget to submit today's report" },
  nl: { title: "VK group", body: "Vergeet het rapport van vandaag niet" },
};

/** Язык хранится при подписке; неизвестное значение — украинский, как и во всём приложении. */
export function reminderText(locale: string): { title: string; body: string } {
  return TEXTS[isLocale(locale) ? locale : DEFAULT_LOCALE];
}
