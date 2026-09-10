/**
 * Один рядок вигляду «зміна» для будь-якого формату експорту
 * (`api/export/route.ts`) — уже відформатовані дата/час (dd.MM, HH:mm,
 * європейський порядок), щоб CSV/Excel/PDF не дублювали форматування.
 */
export interface ExportRow {
  date: string;
  worker: string;
  site: string;
  start: string;
  /** `HH:mm` або підпис «триває» для незакритої зміни. */
  end: string;
  breakMinutes: number;
  /** `null` — зміна ще триває. */
  totalMinutes: number | null;
  workedMinutes: number;
  overtimeMinutes: number;
  description: string;
  photoCount: number;
}

export interface ExportMeta {
  companyName: string;
  /** Заголовок періоду — «Липень 2025» тощо, вже готовий рядок. */
  periodTitle: string;
}
