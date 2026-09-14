import { sumTotalMinutes } from "@/modules/time/calc";
import type { WorkEntryWithNames } from "@/modules/entries/types";

export interface DashboardOverview {
  totalMinutes: number;
  avgPerWorkdayMinutes: number;
  objectsWorkedCount: number;
}

/**
 * Зведення по періоду для 4 stat-карток. `avgPerWorkdayMinutes` рахує
 * середнє тільки по днях, коли реально хтось працював — не по всіх днях
 * періоду, інакше в перших числах місяця цифра була б заниженою.
 */
export function buildOverview(entries: readonly WorkEntryWithNames[]): DashboardOverview {
  const totalMinutes = sumTotalMinutes(entries);
  const workDates = new Set(entries.map((entry) => entry.work_date));
  const siteIds = new Set(
    entries.map((entry) => entry.site_id).filter((id): id is string => id !== null),
  );

  return {
    totalMinutes,
    avgPerWorkdayMinutes: workDates.size === 0 ? 0 : Math.round(totalMinutes / workDates.size),
    objectsWorkedCount: siteIds.size,
  };
}

export interface RankedItem {
  id: string;
  name: string;
  minutes: number;
}

function buildRanked(
  entries: readonly WorkEntryWithNames[],
  keyOf: (entry: WorkEntryWithNames) => string | null,
  nameOf: (entry: WorkEntryWithNames) => string,
): RankedItem[] {
  const byId = new Map<string, { name: string; minutes: number }>();

  for (const entry of entries) {
    const id = keyOf(entry);
    if (id === null) continue;

    const current = byId.get(id) ?? { name: nameOf(entry), minutes: 0 };
    current.minutes += entry.total_minutes ?? 0;
    byId.set(id, current);
  }

  return [...byId.entries()]
    .map(([id, value]) => ({ id, ...value }))
    .sort((a, b) => b.minutes - a.minutes);
}

/** Рейтинг об'єктів за годинами періоду — блок «Топ-об'єкти». */
export function buildTopSites(entries: readonly WorkEntryWithNames[]): RankedItem[] {
  return buildRanked(
    entries,
    (entry) => entry.site_id,
    (entry) => entry.site_name ?? "",
  );
}

/** Рейтинг співробітників за годинами періоду — блок «Години по співробітниках». */
export function buildTopWorkers(entries: readonly WorkEntryWithNames[]): RankedItem[] {
  return buildRanked(
    entries,
    (entry) => entry.author_id,
    (entry) => entry.author_full_name,
  );
}

export interface TodayOverview {
  activeCount: number;
  openShiftNames: string[];
  totalMinutes: number;
}

/**
 * Блок «Сьогодні». `activeCount` — скільки різних людей сьогодні хоч щось
 * відмітили (закриту чи відкриту зміну), `openShiftNames` — тільки ті, у
 * кого зміна ще триває (`ended_at === null`) — це і є бейджі «Відкрито».
 */
export function buildTodayOverview(
  todayEntries: readonly WorkEntryWithNames[],
): TodayOverview {
  const activeAuthorIds = new Set(todayEntries.map((entry) => entry.author_id));
  const openShiftNames = [
    ...new Set(
      todayEntries
        .filter((entry) => entry.ended_at === null)
        .map((entry) => entry.author_full_name),
    ),
  ];

  return {
    activeCount: activeAuthorIds.size,
    openShiftNames,
    totalMinutes: sumTotalMinutes(todayEntries),
  };
}
