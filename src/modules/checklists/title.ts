import { fmt, formatDayMonth, fromDateKey } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";
import { brusselsClock } from "@/modules/reminders/schedule";

/**
 * Название нового чеклиста, которое подставляется само («Чеклист · 15 жовтня»), чтобы его не нужно было вводить.
 * Дата — по Брюсселю (бригада работает там), а не по часовому поясу сервера: после полуночи по Бельгии
 * сервер в UTC ещё живёт во вчерашнем дне.
 */
export function defaultChecklistTitle(template: string, now: Date, locale: Locale): string {
  return fmt(template, { date: formatDayMonth(fromDateKey(brusselsClock(now).dateKey), locale) });
}
