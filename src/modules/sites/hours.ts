import type { WorkEntryWithNames } from "@/modules/entries/types";
import type { Site } from "@/modules/sites/queries";

interface SiteHours {
  minutes: number;
  workerCount: number;
}

/**
 * Агрегує хвилини й кількість унікальних робітників по кожному об'єкту за
 * обраний період — «Об'єкти» (`/objects`). Записи без
 * `site_id` (ручний запис поза об'єктом) до жодного об'єкта не додаються.
 * Той самий патерн, що й `buildWorkerHoursList` у `modules/team/hours.ts`.
 *
 * Внутрішня деталь реалізації `buildSiteHoursList` — не експортується,
 * назовні модуль віддає тільки готовий список.
 */
function buildSiteHoursMap(
  entries: readonly Pick<WorkEntryWithNames, "site_id" | "author_id" | "total_minutes">[],
): Map<string, SiteHours & { workers: Set<string> }> {
  const bySite = new Map<string, SiteHours & { workers: Set<string> }>();

  for (const entry of entries) {
    if (!entry.site_id) continue;

    const bucket = bySite.get(entry.site_id) ?? { minutes: 0, workerCount: 0, workers: new Set<string>() };
    bucket.minutes += entry.total_minutes ?? 0;
    bucket.workers.add(entry.author_id);
    bucket.workerCount = bucket.workers.size;
    bySite.set(entry.site_id, bucket);
  }

  return bySite;
}

export interface SiteWithHours extends Site {
  minutes: number;
  workerCount: number;
}

/**
 * Зводить повний список об'єктів компанії (включно з архівними й тими, де
 * за період не було жодного запису — 0 год) з агрегованими годинами/кількістю
 * людей. Порядок об'єктів зберігається таким, яким прийшов у `sites`.
 */
export function buildSiteHoursList(
  sites: readonly Site[],
  entries: readonly Pick<WorkEntryWithNames, "site_id" | "author_id" | "total_minutes">[],
): SiteWithHours[] {
  const bySite = buildSiteHoursMap(entries);

  return sites.map((site) => {
    const bucket = bySite.get(site.id);
    return {
      ...site,
      minutes: bucket?.minutes ?? 0,
      workerCount: bucket?.workerCount ?? 0,
    };
  });
}
