import { Download, FileSpreadsheet, FileText, type LucideIcon } from "lucide-react";

import type { Dict } from "@/lib/i18n";

export type ExportFormat = "csv" | "xlsx" | "pdf";
export type ExportKind = "hours" | "reports";

interface ExportFormatOption {
  format: ExportFormat;
  label: string;
  icon: LucideIcon;
}

/**
 * Список форматів для вибору в листі експорту (`TeamExportSheet`).
 * Години — CSV, Excel, PDF-табель; звіти поки тільки CSV — xlsx/pdf під звіти не робили.
 */
export function getExportFormats(kind: ExportKind, t: Dict): readonly ExportFormatOption[] {
  if (kind === "reports") {
    return [{ format: "csv", label: t.export.csv, icon: Download }];
  }

  return [
    { format: "csv", label: t.export.csv, icon: Download },
    { format: "xlsx", label: t.export.xlsx, icon: FileSpreadsheet },
    { format: "pdf", label: t.export.pdf, icon: FileText },
  ];
}

interface BuildExportUrlParams {
  from: string;
  to: string;
  format: ExportFormat;
  kind?: ExportKind;
  /** Одиночний робітник (картка робітника в «Команді»). */
  workerId?: string;
  /** Мультивибір з чекбоксів в адмінці — має пріоритет над `workerId`. */
  workerIds?: readonly string[];
}

/**
 * Єдина точка збірки URL `/api/export` — щоб лист експорту і шеринг
 * (`shareExport`) не розходились у форматі параметрів.
 */
export function buildExportUrl({
  from,
  to,
  format,
  kind = "hours",
  workerId,
  workerIds,
}: BuildExportUrlParams): string {
  const params = new URLSearchParams({ from, to, format, kind });

  if (workerIds && workerIds.length > 0) {
    params.set("workerIds", workerIds.join(","));
  } else if (workerId) {
    params.set("workerId", workerId);
  }

  return `/api/export?${params.toString()}`;
}
