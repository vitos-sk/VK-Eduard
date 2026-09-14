import type { ReportExportRow } from "./types";

/** Экранирует поле CSV: кавычки — двойными, оборачивает при спецсимволах. */
function csvField(value: string): string {
  if (/[",\r\n;]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

const HEADER = ["Дата", "Робітник", "Об'єкт", "Категорії", "Опис", "Фото"];

/** CSV «Звіти» за діапазон дат — UTF-8 з BOM, як і у CSV «Години». */
export function buildReportsCsv(rows: readonly ReportExportRow[]): string {
  const lines = [HEADER.map(csvField).join(",")];

  for (const row of rows) {
    const cells = [row.date, row.worker, row.site, row.categories, row.description, String(row.photoCount)];
    lines.push(cells.map(csvField).join(","));
  }

  // BOM в начале — иначе Excel показывает кириллицу кракозябрами.
  return "﻿" + lines.join("\r\n");
}
