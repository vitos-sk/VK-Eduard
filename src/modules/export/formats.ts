import { Download, FileSpreadsheet, FileText, type LucideIcon } from "lucide-react";

import { t } from "@/lib/i18n";

export type ExportFormat = "csv" | "xlsx" | "pdf";
export type ExportKind = "hours" | "reports";

interface ExportFormatOption {
  format: ExportFormat;
  label: string;
  icon: LucideIcon;
}

/** Список форматів для «Годин» — спільний для `ExportMenu` і `ShareWhatsAppButton`. */
export const HOURS_FORMATS: readonly ExportFormatOption[] = [
  { format: "csv", label: t.admin.export.csv, icon: Download },
  { format: "xlsx", label: t.admin.export.xlsx, icon: FileSpreadsheet },
  { format: "pdf", label: t.admin.export.pdf, icon: FileText },
];

/** Звіти поки експортуються тільки в CSV — xlsx/pdf під звіти не робили. */
export const REPORTS_FORMATS: readonly ExportFormatOption[] = [
  { format: "csv", label: t.admin.export.csv, icon: Download },
];

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
 * Єдина точка збірки URL `/api/export` — щоб `ExportMenu` і
 * `ShareWhatsAppButton` не розходились у форматі параметрів.
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
