import type { Dict } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/locales";
import type { ExportRow } from "./types";

/**
 * Разделитель CSV. Excel открывает файл по настройкам региона: там, где десятичный знак — запятая
 * (украинский, нидерландский), запятая в роли разделителя склеила бы всё в одну колонку,
 * поэтому для них точка с запятой. Для английского — обычная запятая.
 */
export function csvDelimiter(locale: Locale): string {
  return locale === "en" ? "," : ";";
}

/** Число с двумя знаками после запятой; десятичный знак — по языку, чтобы Excel узнал число. */
export function csvNumber(value: number, locale: Locale): string {
  const text = value.toFixed(2);

  return locale === "en" ? text : text.replace(".", ",");
}

/** Экранирует поле CSV: кавычки — двойными, оборачивает при спецсимволах. */
export function csvField(value: string, delimiter: string): string {
  if (value.includes('"') || value.includes(delimiter) || /[\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

/** Час-минуты → десятичные часы (`7:30` → `7.50`) — для умножения на ставку. */
export function toHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

/**
 * CSV «Години»: одна строка — одна смена. Колонки: дата (ГГГГ-ММ-ДД), день недели, сотрудник,
 * объект, начало, конец, перерыв (мин), часы и часы сверх нормы (десятичные), описание.
 * UTF-8 с BOM — иначе Excel ломает кириллицу.
 */
export function buildCsv(rows: readonly ExportRow[], t: Dict, locale: Locale): string {
  const delimiter = csvDelimiter(locale);
  const c = t.export.columns;
  const header = [c.date, c.weekday, c.worker, c.site, c.start, c.end, c.breakMinutes, c.hours, c.overtimeHours, c.description];

  const lines = [header.map((cell) => csvField(cell, delimiter)).join(delimiter)];

  for (const row of rows) {
    const cells = [
      row.dateKey,
      row.weekday,
      row.worker,
      row.site,
      row.start,
      row.end,
      String(row.breakMinutes),
      row.totalMinutes === null ? "" : csvNumber(toHours(row.totalMinutes), locale),
      row.totalMinutes === null ? "" : csvNumber(toHours(row.overtimeMinutes), locale),
      row.description,
    ];

    lines.push(cells.map((cell) => csvField(cell, delimiter)).join(delimiter));
  }

  // BOM в начале — иначе Excel показывает кириллицу кракозябрами.
  return "﻿" + lines.join("\r\n");
}
