import { sumTotalMinutes } from "@/modules/time/calc";
import type { WorkEntryWithNames } from "@/modules/entries/types";

export interface DashboardOverview {
  totalMinutes: number;
  /** Скільки різних людей мали хоч одну зміну за період. */
  workersCount: number;
  objectsWorkedCount: number;
  /** Години без прив'язки до об'єкта — те, що шефу варто дорозібрати. */
  noSiteMinutes: number;
}

/** Зведення по періоду для 4 stat-карток. */
export function buildOverview(entries: readonly WorkEntryWithNames[]): DashboardOverview {
  const authorIds = new Set(entries.map((entry) => entry.author_id));
  const siteIds = new Set(
    entries.map((entry) => entry.site_id).filter((id): id is string => id !== null),
  );

  return {
    totalMinutes: sumTotalMinutes(entries),
    workersCount: authorIds.size,
    objectsWorkedCount: siteIds.size,
    noSiteMinutes: sumTotalMinutes(entries.filter((entry) => entry.site_id === null)),
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

export interface WorkingNow {
  id: string;
  name: string;
  siteName: string | null;
  /** Час початку відкритої зміни, `HH:MM:SS`. */
  since: string;
}

export interface TodayOverview {
  /** Люди з відкритою зміною просто зараз. */
  workingNow: WorkingNow[];
  /** Активні співробітники, у яких сьогодні ще немає жодного запису. */
  withoutEntries: { id: string; name: string }[];
  totalMinutes: number;
}

/**
 * Блок «Зараз на роботі». Дедуплікація йде по `author_id`, не по імені —
 * двоє тезок з відкритими змінами дають два окремі рядки.
 */
export function buildTodayOverview(
  todayEntries: readonly WorkEntryWithNames[],
  workers: readonly { id: string; name: string }[],
): TodayOverview {
  const workingById = new Map<string, WorkingNow>();
  for (const entry of todayEntries) {
    if (entry.ended_at === null) {
      workingById.set(entry.author_id, {
        id: entry.author_id,
        name: entry.author_full_name,
        siteName: entry.site_name,
        since: entry.started_at,
      });
    }
  }

  const clockedIds = new Set(todayEntries.map((entry) => entry.author_id));

  return {
    workingNow: [...workingById.values()].sort((a, b) => a.since.localeCompare(b.since)),
    withoutEntries: workers.filter((worker) => !clockedIds.has(worker.id)),
    totalMinutes: sumTotalMinutes(todayEntries),
  };
}

export interface WorkerPeriodRow {
  id: string;
  name: string;
  minutes: number;
  /** Дні періоду, в які є хоч один запис. */
  daysWithEntries: number;
  /** Робочі дні (пн–пт) до сьогодні, у які запису немає. */
  daysWithoutEntries: number;
}

/**
 * Таблиця «Години по співробітниках»: години, дні із записами, дні без запису.
 * Дні без запису — робочі (пн–пт) від початку періоду до `today` включно, коли в людини
 * не було жодного запису. Усі активні співробітники присутні в таблиці, навіть без годин.
 * `fromKey`/`toKey` — межі періоду `YYYY-MM-DD`, `todayKey` — сьогодні.
 */
export function buildWorkerPeriodRows(
  entries: readonly WorkEntryWithNames[],
  workers: readonly { id: string; name: string }[],
  fromKey: string,
  toKey: string,
  todayKey: string,
): WorkerPeriodRow[] {
  const lastKey = toKey < todayKey ? toKey : todayKey;

  let workdays = 0;
  const cursor = new Date(`${fromKey}T00:00:00`);
  const end = new Date(`${lastKey}T00:00:00`);
  while (cursor <= end) {
    const weekday = cursor.getDay();
    if (weekday !== 0 && weekday !== 6) workdays += 1;
    cursor.setDate(cursor.getDate() + 1);
  }

  const minutesById = new Map<string, number>();
  const daysById = new Map<string, Set<string>>();
  for (const entry of entries) {
    minutesById.set(entry.author_id, (minutesById.get(entry.author_id) ?? 0) + (entry.total_minutes ?? 0));
    const days = daysById.get(entry.author_id) ?? new Set<string>();
    days.add(entry.work_date);
    daysById.set(entry.author_id, days);
  }

  return workers
    .map((worker) => {
      const daysWithEntries = daysById.get(worker.id)?.size ?? 0;

      return {
        id: worker.id,
        name: worker.name,
        minutes: minutesById.get(worker.id) ?? 0,
        daysWithEntries,
        daysWithoutEntries: Math.max(0, workdays - daysWithEntries),
      };
    })
    .sort((a, b) => b.minutes - a.minutes);
}
