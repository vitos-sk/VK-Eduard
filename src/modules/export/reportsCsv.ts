import type { Dict } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/locales";
import { csvDelimiter, csvField } from "./csv";
import type { ReportExportRow } from "./types";

/**
 * CSV «Звіти»: дата (ГГГГ-ММ-ДД), сотрудник, объект, виды работ, описание, число фото.
 * Разделитель и кодировка — те же, что у CSV «Години».
 */
export function buildReportsCsv(rows: readonly ReportExportRow[], t: Dict, locale: Locale): string {
  const delimiter = csvDelimiter(locale);
  const c = t.export.columns;
  const header = [c.date, c.worker, c.site, c.categories, c.description, c.photos];
  const lines = [header.map((cell) => csvField(cell, delimiter)).join(delimiter)];

  for (const row of rows) {
    const cells = [row.date, row.worker, row.site, row.categories, row.description, String(row.photoCount)];
    lines.push(cells.map((cell) => csvField(cell, delimiter)).join(delimiter));
  }

  // BOM в начале — иначе Excel показывает кириллицу кракозябрами.
  return "﻿" + lines.join("\r\n");
}
