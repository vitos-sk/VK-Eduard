import { formatHoursShort, formatTimeShort } from "@/lib/format";
import type { Dict } from "@/lib/i18n";
import { INTL_TAGS, type Locale } from "@/lib/i18n/locales";
import { breakMinutes } from "@/modules/time/calc";

/**
 * Текст расчёта зарплаты для копирования (бухгалтеру, в мессенджер) — на языке интерфейса:
 *
 *   Payroll 01.–31. October 2026
 *
 *   01.10. Thu. · 10:00–12:00 · -10min · Freiburg
 *   ...
 *
 *   Total: 11:05 h
 *   Hourly rate: 15.00 €/h
 *   Total pay: 166.25 €
 *
 * Названия и единицы — из словаря (`t.payroll`), дни недели и месяцы — из `t.weekdays` / `t.months`,
 * числа — по правилам языка (запятая или точка).
 */

export interface PayrollEntry {
  author_id: string | null;
  /** `YYYY-MM-DD`. */
  work_date: string;
  /** `HH:mm` или `HH:mm:ss`. */
  started_at: string;
  ended_at: string | null;
  break_start: string | null;
  break_end: string | null;
  /** Чистое время смены в минутах (без перерыва); `null` — смена ещё идёт. */
  total_minutes: number | null;
  site_name: string | null;
}

export interface PayrollPerson {
  id: string;
  name: string;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** `15,00` / `15.00` — число с двумя знаками после запятой по правилам языка. */
export function formatNumber(value: number, locale: Locale): string {
  return value.toLocaleString(INTL_TAGS[locale], { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** `01.–31. October 2026` для месяца, в который попадает `monthDate`. */
export function payrollPeriod(monthDate: Date, t: Dict): string {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();

  return `01.–${pad(lastDay)}. ${t.months.genitive[month]} ${year}`;
}

/** `01.10. Thu. · 10:00–12:00 · -10min · Freiburg`. */
export function payrollLine(entry: PayrollEntry, t: Dict): string {
  const [year = 0, month = 1, day = 1] = entry.work_date.split("-").map(Number);
  const weekday = t.weekdays.short[new Date(year, month - 1, day).getDay()];
  const pause = breakMinutes(entry.break_start, entry.break_end);

  const parts = [
    `${pad(day)}.${pad(month)}. ${weekday}.`,
    `${formatTimeShort(entry.started_at)}–${entry.ended_at ? formatTimeShort(entry.ended_at) : ""}`,
  ];

  if (pause > 0) parts.push(`-${pause}${t.payroll.min}`);
  if (entry.site_name) parts.push(entry.site_name);

  return parts.join(" · ");
}

function sumMinutes(entries: readonly PayrollEntry[]): number {
  return entries.reduce((sum, entry) => sum + (entry.total_minutes ?? 0), 0);
}

export interface PayrollOptions {
  entries: readonly PayrollEntry[];
  /** Любой день нужного месяца. */
  monthDate: Date;
  /** За кого составляем расчёт, в порядке вывода. */
  people: readonly PayrollPerson[];
  /** Почасовая ставка; `null` — не введена (строки со ставкой и суммой пропускаются). */
  rate: number | null;
  /** Подписывать блок именем сотрудника — когда в расчёте не только сам пользователь. */
  showNames: boolean;
  t: Dict;
  locale: Locale;
}

/** Закрытые смены человека по порядку даты и времени. */
function entriesOf(entries: readonly PayrollEntry[], personId: string): PayrollEntry[] {
  return entries
    .filter((entry) => entry.author_id === personId && entry.ended_at !== null)
    .sort(
      (a, b) =>
        a.work_date.localeCompare(b.work_date) || a.started_at.localeCompare(b.started_at),
    );
}

function totalsLines(minutes: number, rate: number | null, t: Dict, locale: Locale): string[] {
  const unit = t.payroll.hour;
  const lines = [`${t.payroll.total}: ${formatHoursShort(minutes)} ${unit}`];

  if (rate !== null) {
    lines.push(`${t.payroll.rate}: ${formatNumber(rate, locale)} €/${unit}`);
    lines.push(`${t.payroll.pay}: ${formatNumber((minutes / 60) * rate, locale)} €`);
  }

  return lines;
}

/** Итоговая сумма к выплате по выбранным людям; `null`, пока ставка не введена. */
export function payrollAmount(entries: readonly PayrollEntry[], people: readonly PayrollPerson[], rate: number | null): number | null {
  if (rate === null) return null;

  const minutes = people.reduce((sum, person) => sum + sumMinutes(entriesOf(entries, person.id)), 0);

  return (minutes / 60) * rate;
}

export function buildPayrollText({ entries, monthDate, people, rate, showNames, t, locale }: PayrollOptions): string {
  const header = `${t.payroll.title} ${payrollPeriod(monthDate, t)}`;
  const blocks: string[] = [];
  let allMinutes = 0;

  for (const person of people) {
    const own = entriesOf(entries, person.id);
    const minutes = sumMinutes(own);
    allMinutes += minutes;

    const lines = [header];
    if (showNames) lines.push(`${t.payroll.employee}: ${person.name}`);
    lines.push("");
    lines.push(...(own.length > 0 ? own.map((entry) => payrollLine(entry, t)) : [t.payroll.noEntries]));
    lines.push("");
    lines.push(...totalsLines(minutes, rate, t, locale));

    blocks.push(lines.join("\n"));
  }

  if (people.length > 1) {
    blocks.push([t.payroll.all, ...totalsLines(allMinutes, rate, t, locale)].join("\n"));
  }

  return blocks.join("\n\n");
}
