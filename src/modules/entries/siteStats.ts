import { reportState } from "@/modules/entries/reportState";
import type { WorkEntryWithPhotos } from "@/modules/entries/types";

/**
 * Сводка по одному объекту, посчитанная из записей автора — не наоборот:
 * `sites` ничего не знает про `work_entries` (ARCHITECTURE.md, границы
 * модулей), поэтому агрегация живёт здесь, а не в `modules/sites`.
 */
export interface SiteStats {
  photosCount: number;
  /** Записи, которые уже стали звітом — есть описание или хоть одно фото. */
  reportsCount: number;
  /** Самая свежая дата записи на объекте — для сортировки «останні об'єкти». */
  lastWorkedDate: string | null;
}

/** Считает статистику по каждому объекту из плоского списка записей автора. */
export function aggregateSiteStats(
  entries: readonly WorkEntryWithPhotos[],
): Map<string, SiteStats> {
  const stats = new Map<string, SiteStats>();

  for (const entry of entries) {
    if (!entry.site_id) continue;

    const current = stats.get(entry.site_id) ?? {
      photosCount: 0,
      reportsCount: 0,
      lastWorkedDate: null,
    };

    current.photosCount += entry.entry_photos.length;

    if (reportState(entry, entry.entry_photos.length) !== "no_description") {
      current.reportsCount += 1;
    }

    if (current.lastWorkedDate === null || entry.work_date > current.lastWorkedDate) {
      current.lastWorkedDate = entry.work_date;
    }

    stats.set(entry.site_id, current);
  }

  return stats;
}
