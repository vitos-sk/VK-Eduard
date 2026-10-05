import { format, parse } from "date-fns";

import { DATE_FNS_LOCALES, INTL_TAGS, type Locale } from "@/lib/i18n/locales";

/**
 * Подставляет значения в плейсхолдеры вида `{name}`.
 *
 * @example fmt(t.home.greetingMorning, { name: "Віталік" }) // «Доброго ранку, Віталік»
 */
export function fmt(
  template: string,
  params: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}

/**
 * Подбирает форму слова по числу: «1 зміна», «2 зміни», «5 змін». Правила множественного числа —
 * свои у каждого языка (`Intl.PluralRules`): в украинском три формы, в английском и нидерландском две.
 */
export function pluralize(
  count: number,
  locale: Locale,
  forms: { one: string; few: string; many: string },
): string {
  const category = new Intl.PluralRules(INTL_TAGS[locale]).select(count);
  const template = category === "one" ? forms.one : category === "few" ? forms.few : forms.many;

  return template.replace("{n}", String(count));
}

/** Первая буква — заглавная. `date-fns` отдаёт названия дней и месяцев строчными. */
function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function pad(value: number): string {
  return String(Math.trunc(value)).padStart(2, "0");
}

/** Минуты → `5:42`. Формат «ч:мм» везде в интерфейсе: `0:30`, `8:00`, `176:30`. */
export function formatHoursShort(totalMin: number): string {
  const safe = Math.max(0, Math.trunc(totalMin));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;

  return `${hours}:${pad(minutes)}`;
}

/** Число → `25 200,50 €` (разделители по языку). Калькулятор зарплати на екрані «Години». */
export function formatCurrency(amount: number, locale: Locale): string {
  const formatted = amount.toLocaleString(INTL_TAGS[locale], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} €`;
}

/** `Середа, 30 липня` — заголовок даты под приветствием. */
export function formatDateLong(date: Date, locale: Locale): string {
  return capitalize(format(date, "EEEE, d MMMM", { locale: DATE_FNS_LOCALES[locale] }));
}

/** `Середа, 30 липня 2025` — навигатор периода на экране «Години». */
export function formatDateFull(date: Date, locale: Locale): string {
  return capitalize(format(date, "EEEE, d MMMM yyyy", { locale: DATE_FNS_LOCALES[locale] }));
}

/** `30.07.2025` — компактная дата в формах и карточках. */
export function formatDateShort(date: Date, locale: Locale): string {
  return format(date, "dd.MM.yyyy", { locale: DATE_FNS_LOCALES[locale] });
}

/** `30 липня` — заголовок группы отчётов за прошедшую дату. */
export function formatDayMonth(date: Date, locale: Locale): string {
  return format(date, "d MMMM", { locale: DATE_FNS_LOCALES[locale] });
}

/** `YYYY-MM-DD` → `30.07` — узкая колонка «Дата» в таблице «Зміни за місяць». */
export function formatWorkDateShort(workDate: string, locale: Locale): string {
  return format(fromDateKey(workDate), "dd.MM", { locale: DATE_FNS_LOCALES[locale] });
}

/** `14:58:00` → `14:58` — без секунд, для узких таблиц. */
export function formatTimeShort(time: string): string {
  return time.slice(0, 5);
}

/** `08:00`. */
export function formatTime(date: Date): string {
  return format(date, "HH:mm");
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
