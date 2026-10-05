/**
 * Один рядок вигляду «зміна» для будь-якого формату експорту
 * (`api/export/route.ts`) — уже відформатовані дата/час (dd.MM, HH:mm,
 * європейський порядок), щоб CSV/Excel/PDF не дублювали форматування.
 */
export interface ExportRow {
  /** `YYYY-MM-DD` — для CSV та справжніх дат у Excel. */
  dateKey: string;
  /** Скорочена назва дня тижня мовою інтерфейсу. */
  weekday: string;
  /** Коротка дата `dd.MM` — для PDF. */
  date: string;
  worker: string;
  site: string;
  start: string;
  /** `HH:mm` або підпис «триває» для незакритої зміни. */
  end: string;
  breakMinutes: number;
  /** `null` — зміна ще триває. */
  totalMinutes: number | null;
  /** Час до денної норми — PDF. */
  workedMinutes: number;
  /** Час понад денну норму. */
  overtimeMinutes: number;
  description: string;
  photoCount: number;
}

export interface ExportMeta {
  companyName: string;
  /** Заголовок періоду — «Липень 2025» тощо, вже готовий рядок. */
  periodTitle: string;
}

/** Один рядок «звіту» для CSV-експорту — на відміну від `ExportRow`, без часу. */
export interface ReportExportRow {
  /** `YYYY-MM-DD`. */
  date: string;
  worker: string;
  site: string;
  /** Мітки категорій через «; ». */
  categories: string;
  description: string;
  photoCount: number;
}

/** Название в экспортируемых файлах (имя файла, шапка PDF, автор Excel) — «VK group», а не название компании из базы. */
export const EXPORT_BRAND = "VK group";

/** Префикс имени файла: `VK-group`. */
export const EXPORT_FILE_PREFIX = EXPORT_BRAND.replace(/\s+/g, "-");
