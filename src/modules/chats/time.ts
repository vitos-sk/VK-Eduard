import { addDays, isSameDay } from "date-fns";

import { formatDayMonth, formatTime } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";

interface DayLabels {
  today: string;
  yesterday: string;
}

/** Подпись дня: «Сьогодні», «Вчора», иначе «15.10» (число и месяц на языке интерфейса). */
export function dayLabel(date: Date, now: Date, labels: DayLabels, locale: Locale): string {
  if (isSameDay(date, now)) return labels.today;
  if (isSameDay(date, addDays(now, -1))) return labels.yesterday;

  return formatDayMonth(date, locale);
}

/** Время у строки списка чатов: сегодня — часы и минуты, иначе подпись дня («Вчора», «15.10»). */
export function listTimeLabel(date: Date, now: Date, labels: DayLabels, locale: Locale): string {
  return isSameDay(date, now) ? formatTime(date) : dayLabel(date, now, labels, locale);
}

/** Новый день в переписке: нужен ли разделитель с датой перед сообщением. */
export function startsNewDay(previous: Date | null, current: Date): boolean {
  return previous === null || !isSameDay(previous, current);
}
