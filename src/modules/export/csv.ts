import { t } from "@/lib/i18n";
import type { ExportRow } from "./types";

/** Экранирует поле CSV: кавычки — двойными, оборачивает при спецсимволах. */
function csvField(value: string): string {
  if (/[",\r\n;]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

const HEADER = [
  "Дата",
  "Робітник",
  "Об'єкт",
  "Початок",
  "Кінець",
  "Перерва (хв)",
  "Всього (хв)",
  "Відпрацьовано (хв)",
  "Додатково (хв)",
  "Опис",
  "Фото",
];

/** CSV за диапазон дат — UTF-8 з BOM (інакше Excel ламає кирилицю). */
export function buildCsv(rows: readonly ExportRow[]): string {
  const lines = [HEADER.map(csvField).join(",")];

  for (const row of rows) {
    const cells = [
      row.date,
      row.worker,
      row.site,
      row.start,
      row.end,
      String(row.breakMinutes),
      row.totalMinutes === null ? t.hours.entryOngoing : String(row.totalMinutes),
      String(row.workedMinutes),
      String(row.overtimeMinutes),
      row.description,
      String(row.photoCount),
    ];

    lines.push(cells.map(csvField).join(","));
  }

  // BOM в начале — иначе Excel показывает кириллицу кракозябрами.
  return "﻿" + lines.join("\r\n");
}
