import { isSameDay } from "date-fns";

import { formatDayMonth, formatTime } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";

/**
 * Когда сохранена копия, которую показываем без сети: «14:32», если сегодня, иначе «20 жовтня, 14:32».
 * Время нужно человеку, чтобы понимать, насколько данные устарели (особенно зарплата).
 */
export function formatSavedAt(savedAt: number, now: number, locale: Locale): string {
  const date = new Date(savedAt);

  if (isSameDay(date, new Date(now))) return formatTime(date);

  return `${formatDayMonth(date, locale)}, ${formatTime(date)}`;
}
