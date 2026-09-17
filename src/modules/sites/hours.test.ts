import { describe, expect, it } from "vitest";

import { buildSiteHoursList } from "./hours";

function makeSite(overrides: Partial<Parameters<typeof buildSiteHoursList>[0][number]>) {
  return {
    id: "s1",
    company_id: "c1",
    name: "Об'єкт",
    address: null,
    archived_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    kind: null,
    photo_path: null,
    status: "not_started" as const,
    ...overrides,
  };
}

describe("buildSiteHoursList", () => {
  it("рахує хвилини й кількість унікальних робітників на кожному об'єкті", () => {
    const sites = [makeSite({ id: "s1", name: "Об'єкт 1" }), makeSite({ id: "s2", name: "Об'єкт 2" })];
    const entries = [
      { site_id: "s1", author_id: "w1", total_minutes: 120 },
      { site_id: "s1", author_id: "w2", total_minutes: 60 },
      { site_id: "s1", author_id: "w1", total_minutes: 30 },
      { site_id: "s2", author_id: "w1", total_minutes: 480 },
    ];

    expect(buildSiteHoursList(sites, entries)).toEqual([
      { ...sites[0], minutes: 210, workerCount: 2 },
      { ...sites[1], minutes: 480, workerCount: 1 },
    ]);
  });

  it("включає об'єкти без жодного запису за період — з 0 хвилин і 0 людей", () => {
    const sites = [makeSite({ id: "s1" }), makeSite({ id: "s2" })];
    const entries = [{ site_id: "s1", author_id: "w1", total_minutes: 100 }];

    expect(buildSiteHoursList(sites, entries)).toEqual([
      { ...sites[0], minutes: 100, workerCount: 1 },
      { ...sites[1], minutes: 0, workerCount: 0 },
    ]);
  });

  it("ігнорує записи без site_id (ручний запис поза об'єктом)", () => {
    const sites = [makeSite({ id: "s1" })];
    const entries = [
      { site_id: "s1", author_id: "w1", total_minutes: 100 },
      { site_id: null, author_id: "w2", total_minutes: 999 },
    ];

    expect(buildSiteHoursList(sites, entries)).toEqual([{ ...sites[0], minutes: 100, workerCount: 1 }]);
  });

  it("трактує total_minutes: null як 0, не рахуючи автора двічі на одному об'єкті", () => {
    const sites = [makeSite({ id: "s1" })];
    const entries = [
      { site_id: "s1", author_id: "w1", total_minutes: null },
      { site_id: "s1", author_id: "w1", total_minutes: 60 },
    ];

    expect(buildSiteHoursList(sites, entries)).toEqual([{ ...sites[0], minutes: 60, workerCount: 1 }]);
  });

  it("повертає порожній список для порожнього списку об'єктів", () => {
    expect(buildSiteHoursList([], [{ site_id: "s1", author_id: "w1", total_minutes: 100 }])).toEqual([]);
  });
});
