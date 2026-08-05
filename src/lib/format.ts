import { format, parse } from "date-fns";
import { uk as ukLocale } from "date-fns/locale";

import { t } from "@/lib/i18n";

/**
 * Подставляет значения в плейсхолдеры вида `{name}`.
 *
 * @example fmt(t.home.greeting, { name: "Віталік" }) // «Доброго ранку, Віталік 👋»
 */
export function fmt(
  template: string,
  params: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}

/** Первая буква — заглавная. `date-fns` отдаёт названия дней и месяцев строчными. */
function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function pad(value: number): string {
  return String(Math.trunc(value)).padStart(2, "0");
}

/** Секунды → `05:42:18`. Для таймера на главной и деталей рабочего времени. */
export function formatDuration(totalSec: number): string {
  const safe = Math.max(0, Math.trunc(totalSec));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/** Минуты → `5 год 42 хв`. Ровные часы отдаются без минут: `8 год`. */
export function formatHoursShort(totalMin: number): string {
  const safe = Math.max(0, Math.trunc(totalMin));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;

  if (hours === 0) {
    return `${minutes} ${t.units.minutesShort}`;
  }

  if (minutes === 0) {
    return `${hours} ${t.units.hoursShort}`;
  }

  return `${hours} ${t.units.hoursShort} ${minutes} ${t.units.minutesShort}`;
}

/** `Середа, 30 липня` — заголовок даты под приветствием. */
export function formatDateLong(date: Date): string {
  return capitalize(format(date, "EEEE, d MMMM", { locale: ukLocale }));
}

/** `Середа, 30 липня 2025` — навигатор периода на экране «Години». */
export function formatDateFull(date: Date): string {
  return capitalize(format(date, "EEEE, d MMMM yyyy", { locale: ukLocale }));
}

/** `30.07.2025` — компактная дата в формах и карточках. */
export function formatDateShort(date: Date): string {
  return format(date, "dd.MM.yyyy", { locale: ukLocale });
}

/** `30 липня` — заголовок группы отчётов за прошедшую дату. */
export function formatDayMonth(date: Date): string {
  return format(date, "d MMMM", { locale: ukLocale });
}

/** `08:00`. */
export function formatTime(date: Date): string {
  return format(date, "HH:mm", { locale: ukLocale });
}

/** `YYYY-MM-DD` — ключ, по которому связаны моки. */
export function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** `YYYY-MM-DD` → `Date` в локальной зоне. */
export function fromDateKey(key: string): Date {
  return parse(key, "yyyy-MM-dd", new Date());
}

/** `08:30` → 510 минут от полуночи. */
export function timeToMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

/** 510 минут от полуночи → `08:30`. */
export function minutesToTime(totalMin: number): string {
  const safe = Math.max(0, Math.trunc(totalMin));

  return `${pad(Math.floor(safe / 60))}:${pad(safe % 60)}`;
}

/**
 * Разница между двумя `HH:mm` в минутах.
 * Отрицательный результат означает, что конец раньше начала — это ошибка формы.
 */
export function minutesBetween(start: string, end: string): number {
  return timeToMinutes(end) - timeToMinutes(start);
}
