import { describe, expect, it } from "vitest";

import {
  buildOverview,
  buildTodayOverview,
  buildTopSites,
  buildTopWorkers,
} from "./aggregate";
import type { WorkEntryWithNames } from "@/modules/entries/types";

/** Мінімальна валідна запись — тесты подставляют только то, что важно для сценария. */
function makeEntry(overrides: Partial<WorkEntryWithNames>): WorkEntryWithNames {
  return {
    id: "entry-1",
    client_id: "client-1",
    company_id: "company-1",
    author_id: "author-1",
    author_full_name: "Іван Іванов",
    site_id: "site-1",
    site_name: "Об'єкт А",
    work_date: "2026-09-01",
    started_at: "08:00",
    ended_at: "16:00",
    break_start: null,
    break_end: null,
    source: "manual",
    description: "",
    break_minutes: 0,
    total_minutes: 480,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

describe("buildOverview", () => {
  it("рахує суму годин, середнє на робочий день і кількість об'єктів", () => {
    const overview = buildOverview([
      makeEntry({ work_date: "2026-09-01", site_id: "site-1", total_minutes: 480 }),
      makeEntry({ work_date: "2026-09-01", site_id: "site-2", total_minutes: 120 }),
      makeEntry({ work_date: "2026-09-02", site_id: "site-1", total_minutes: 300 }),
    ]);

    expect(overview.totalMinutes).toBe(900);
    expect(overview.avgPerWorkdayMinutes).toBe(450); // 900 / 2 робочих дня
    expect(overview.objectsWorkedCount).toBe(2);
  });

  it("порожній список не ділить на нуль", () => {
    const overview = buildOverview([]);

    expect(overview).toEqual({
      totalMinutes: 0,
      avgPerWorkdayMinutes: 0,
      objectsWorkedCount: 0,
    });
  });

  it("записи без об'єкта (site_id null) не рахуються в objectsWorkedCount", () => {
    const overview = buildOverview([makeEntry({ site_id: null })]);

    expect(overview.objectsWorkedCount).toBe(0);
  });
});

describe("buildTopSites / buildTopWorkers", () => {
  it("сортує об'єкти за спаданням суми хвилин", () => {
    const ranked = buildTopSites([
      makeEntry({ site_id: "site-1", site_name: "Об'єкт А", total_minutes: 100 }),
      makeEntry({ site_id: "site-2", site_name: "Об'єкт Б", total_minutes: 300 }),
      makeEntry({ site_id: "site-1", site_name: "Об'єкт А", total_minutes: 50 }),
    ]);

    expect(ranked).toEqual([
      { id: "site-2", name: "Об'єкт Б", minutes: 300 },
      { id: "site-1", name: "Об'єкт А", minutes: 150 },
    ]);
  });

  it("пропускає записи без об'єкта", () => {
    const ranked = buildTopSites([makeEntry({ site_id: null })]);

    expect(ranked).toEqual([]);
  });

  it("сортує співробітників за спаданням суми хвилин", () => {
    const ranked = buildTopWorkers([
      makeEntry({ author_id: "a1", author_full_name: "Іван", total_minutes: 60 }),
      makeEntry({ author_id: "a2", author_full_name: "Петро", total_minutes: 200 }),
    ]);

    expect(ranked).toEqual([
      { id: "a2", name: "Петро", minutes: 200 },
      { id: "a1", name: "Іван", minutes: 60 },
    ]);
  });
});

describe("buildTodayOverview", () => {
  it("рахує активних сьогодні і відкриті зміни", () => {
    const overview = buildTodayOverview([
      makeEntry({ author_id: "a1", author_full_name: "Іван", ended_at: "16:00", total_minutes: 480 }),
      makeEntry({ author_id: "a2", author_full_name: "Петро", ended_at: null, total_minutes: null }),
    ]);

    expect(overview.activeCount).toBe(2);
    expect(overview.openShifts).toEqual([{ id: "a2", name: "Петро" }]);
    expect(overview.totalMinutes).toBe(480);
  });

  it("без записів сьогодні — всі нулі", () => {
    expect(buildTodayOverview([])).toEqual({
      activeCount: 0,
      openShifts: [],
      totalMinutes: 0,
    });
  });
});
