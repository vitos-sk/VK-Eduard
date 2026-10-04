import { reportState } from "@/modules/reports/reportState";
import type { SiteReportWithPhotos } from "@/modules/reports/types";

/**
 * Сводка по одному объекту, посчитанная из звітів (`site_reports`) — не
 * наоборот: `sites` ничего не знает про звіти (ARCHITECTURE.md, границы
 * модулей), поэтому агрегация живёт здесь, а не в `modules/sites`.
 */
export interface SiteStats {
  photosCount: number;
  /** Звіти, у которых есть описание или хоть одно фото. */
  reportsCount: number;
  /** Самая свежая дата звіта на объекте — для сортировки «останні об'єкти». */
  lastWorkedDate: string | null;
}

/** Считает статистику по каждому объекту из плоского списка звітів. */
export function aggregateSiteStats(
  reports: readonly Pick<SiteReportWithPhotos, "site_id" | "work_date" | "description" | "report_photos">[],
): Map<string, SiteStats> {
  const stats = new Map<string, SiteStats>();

  for (const report of reports) {
    if (!report.site_id) continue;

    const current = stats.get(report.site_id) ?? {
      photosCount: 0,
      reportsCount: 0,
      lastWorkedDate: null,
    };

    current.photosCount += report.report_photos.length;

    if (reportState(report, report.report_photos.length) !== "no_description") {
      current.reportsCount += 1;
    }

    if (current.lastWorkedDate === null || report.work_date > current.lastWorkedDate) {
      current.lastWorkedDate = report.work_date;
    }

    stats.set(report.site_id, current);
  }

  return stats;
}
