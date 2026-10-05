import { formatHoursShort, formatTimeShort } from "@/lib/format";
import { breakMinutes } from "@/modules/time/calc";

/**
 * Текст «Lohnabrechnung» для копирования (бухгалтеру, в мессенджер).
 * Всегда по-немецки и в одном формате, независимо от языка интерфейса — это
 * документ для расчёта зарплаты, а не часть экрана:
 *
 *   Lohnabrechnung 01.–31. Oktober 2026
 *
 *   01.10. Do. · 10:00–12:00 · -10min · Freiburg
 *   ...
 *
 *   Gesamt: 11:05 h
 *   Stundenlohn: 15,00 €/h
 *   Lohn gesamt: 166,25 €
 */

const WEEKDAYS_DE = ["So.", "Mo.", "Di.", "Mi.", "Do.", "Fr.", "Sa."] as const;

const MONTHS_DE = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
] as const;

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

/** `15,00` — число по-немецки, всегда две цифры после запятой. */
export function formatDe(value: number): string {
  return value.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** `01.–31. Oktober 2026` для месяца, в который попадает `monthDate`. */
export function payrollPeriod(monthDate: Date): string {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();

  return `01.–${pad(lastDay)}. ${MONTHS_DE[month]} ${year}`;
}

/** `01.10. Do. · 10:00–12:00 · -10min · Freiburg`. */
export function payrollLine(entry: PayrollEntry): string {
  const [year = 0, month = 1, day = 1] = entry.work_date.split("-").map(Number);
  const weekday = WEEKDAYS_DE[new Date(year, month - 1, day).getDay()];
  const pause = breakMinutes(entry.break_start, entry.break_end);

  const parts = [
    `${pad(day)}.${pad(month)}. ${weekday}`,
    `${formatTimeShort(entry.started_at)}–${entry.ended_at ? formatTimeShort(entry.ended_at) : ""}`,
  ];

  if (pause > 0) parts.push(`-${pause}min`);
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
  /** Подписывать блок именем («Mitarbeiter: …») — когда в расчёте не только сам пользователь. */
  showNames: boolean;
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

function totalsLines(minutes: number, rate: number | null, label: { hours: string; pay: string }): string[] {
  const lines = [`${label.hours}: ${formatHoursShort(minutes)} h`];

  if (rate !== null) {
    lines.push(`Stundenlohn: ${formatDe(rate)} €/h`);
    lines.push(`${label.pay}: ${formatDe((minutes / 60) * rate)} €`);
  }

  return lines;
}

/** Итоговая сумма к выплате по выбранным людям; `null`, пока ставка не введена. */
export function payrollAmount(entries: readonly PayrollEntry[], people: readonly PayrollPerson[], rate: number | null): number | null {
  if (rate === null) return null;

  const minutes = people.reduce((sum, person) => sum + sumMinutes(entriesOf(entries, person.id)), 0);

  return (minutes / 60) * rate;
}

export function buildPayrollText({ entries, monthDate, people, rate, showNames }: PayrollOptions): string {
  const header = `Lohnabrechnung ${payrollPeriod(monthDate)}`;
  const blocks: string[] = [];
  let allMinutes = 0;

  for (const person of people) {
    const own = entriesOf(entries, person.id);
    const minutes = sumMinutes(own);
    allMinutes += minutes;

    const lines = [header];
    if (showNames) lines.push(`Mitarbeiter: ${person.name}`);
    lines.push("");
    lines.push(...(own.length > 0 ? own.map(payrollLine) : ["Keine Einträge"]));
    lines.push("");
    lines.push(...totalsLines(minutes, rate, { hours: "Gesamt", pay: "Lohn gesamt" }));

    blocks.push(lines.join("\n"));
  }

  if (people.length > 1) {
    blocks.push(
      ["Alle zusammen", ...totalsLines(allMinutes, rate, { hours: "Gesamt", pay: "Lohn gesamt" })].join("\n"),
    );
  }

  return blocks.join("\n\n");
}
