import type { Dict } from "@/lib/i18n";
import type { ExportRow } from "./types";

/** Экранирует поле CSV: кавычки — двойными, оборачивает при спецсимволах. */
function csvField(value: string): string {
  if (/[",\r\n;]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function header(t: Dict): string[] {
  const c = t.export.columns;

  return [
    c.date,
    c.worker,
    c.site,
    c.start,
    c.end,
    c.breakMinutes,
    c.totalMinutes,
    c.workedMinutes,
    c.overtimeMinutes,
    c.description,
    c.photos,
  ];
}

/** CSV за диапазон дат — UTF-8 з BOM (інакше Excel ламає кирилицю). */
export function buildCsv(rows: readonly ExportRow[], t: Dict): string {
  const lines = [header(t).map(csvField).join(",")];

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
