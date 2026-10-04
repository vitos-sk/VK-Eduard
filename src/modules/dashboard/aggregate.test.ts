import { describe, expect, it } from "vitest";

import {
  buildOverview,
  buildTodayOverview,
  buildTopSites,
  buildTopWorkers,
  buildWorkerPeriodRows,
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
  it("рахує суму годин, людей, об'єкти і години без об'єкта", () => {
    const overview = buildOverview([
      makeEntry({ author_id: "a1", site_id: "site-1", total_minutes: 480 }),
      makeEntry({ author_id: "a2", site_id: "site-2", total_minutes: 120 }),
      makeEntry({ author_id: "a1", site_id: null, total_minutes: 60 }),
    ]);

    expect(overview).toEqual({
      totalMinutes: 660,
      workersCount: 2,
      objectsWorkedCount: 2,
      noSiteMinutes: 60,
    });
  });

  it("порожній список — всі нулі", () => {
    expect(buildOverview([])).toEqual({
      totalMinutes: 0,
      workersCount: 0,
      objectsWorkedCount: 0,
      noSiteMinutes: 0,
    });
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
  const workers = [
    { id: "a1", name: "Іван" },
    { id: "a2", name: "Петро" },
    { id: "a3", name: "Олег" },
  ];

  it("показує тих, хто працює зараз, і тих, у кого немає записів", () => {
    const overview = buildTodayOverview(
      [
        makeEntry({ author_id: "a1", ended_at: "16:00", total_minutes: 480 }),
        makeEntry({
          author_id: "a2",
          author_full_name: "Петро",
          site_name: "Об'єкт Б",
          started_at: "07:30:00",
          ended_at: null,
          total_minutes: null,
        }),
      ],
      workers,
    );

    expect(overview.workingNow).toEqual([
      { id: "a2", name: "Петро", siteName: "Об'єкт Б", since: "07:30:00" },
    ]);
    expect(overview.withoutEntries).toEqual([{ id: "a3", name: "Олег" }]);
    expect(overview.totalMinutes).toBe(480);
  });

  it("без записів сьогодні — ніхто не працює, усі без записів", () => {
    expect(buildTodayOverview([], workers)).toEqual({
      workingNow: [],
      withoutEntries: workers,
      totalMinutes: 0,
    });
  });
});

describe("buildWorkerPeriodRows", () => {
  it("считает часы, дни с записями и рабочие дни без записи до сегодня", () => {
    // Чт 1 — Пт 2 — Пн 5 — Вт 6 жовтня 2026: четыре рабочих дня до «сегодня» 6-го.
    const entries = [
      makeEntry({ author_id: "a1", work_date: "2026-10-01", total_minutes: 480 }),
      makeEntry({ author_id: "a1", work_date: "2026-10-01", total_minutes: 60 }),
      makeEntry({ author_id: "a1", work_date: "2026-10-02", total_minutes: 480 }),
      makeEntry({ author_id: "a2", work_date: "2026-10-05", total_minutes: 300 }),
    ];

    const rows = buildWorkerPeriodRows(
      entries,
      [
        { id: "a1", name: "Олег" },
        { id: "a2", name: "Андрій" },
        { id: "a3", name: "Марко" },
      ],
      "2026-10-01",
      "2026-10-31",
      "2026-10-06",
    );

    expect(rows).toEqual([
      { id: "a1", name: "Олег", minutes: 1020, daysWithEntries: 2, daysWithoutEntries: 2 },
      { id: "a2", name: "Андрій", minutes: 300, daysWithEntries: 1, daysWithoutEntries: 3 },
      { id: "a3", name: "Марко", minutes: 0, daysWithEntries: 0, daysWithoutEntries: 4 },
    ]);
  });

  it("не рахує дні після кінця періоду", () => {
    const rows = buildWorkerPeriodRows([], [{ id: "a1", name: "Олег" }], "2026-10-01", "2026-10-02", "2026-12-01");

    expect(rows[0].daysWithoutEntries).toBe(2);
  });
});
