import { describe, expect, it } from "vitest";

import { countByFilter, filterEntries, isChecklistFilter, pickForHome } from "./filter";
import type { ChecklistListEntry } from "./queries";

function entry(partial: Partial<ChecklistListEntry> & { id: string }): ChecklistListEntry {
  return {
    title: partial.id,
    siteName: null,
    senderName: null,
    isReceived: false,
    progress: { done: 0, total: 3 },
    sentCount: 0,
    createdAt: "2026-10-15T07:00:00Z",
    ...partial,
  };
}

const entries = [
  entry({ id: "own-open" }),
  entry({ id: "own-done", progress: { done: 3, total: 3 } }),
  entry({ id: "got-new", isReceived: true, senderName: "Олег" }),
  entry({ id: "got-done", isReceived: true, progress: { done: 2, total: 2 } }),
];

describe("filterEntries", () => {
  it("«Усі» — всё", () => {
    expect(filterEntries(entries, "all")).toHaveLength(4);
  });

  it("«Мої» — только свои", () => {
    expect(filterEntries(entries, "mine").map((item) => item.id)).toEqual(["own-open", "own-done"]);
  });

  it("«Отримані» — только присланные", () => {
    expect(filterEntries(entries, "received").map((item) => item.id)).toEqual(["got-new", "got-done"]);
  });

  it("«Готові» — полностью выполненные, и свои, и присланные", () => {
    expect(filterEntries(entries, "done").map((item) => item.id)).toEqual(["own-done", "got-done"]);
  });

  it("чеклист без пунктов не считается готовым", () => {
    expect(filterEntries([entry({ id: "empty", progress: { done: 0, total: 0 } })], "done")).toEqual([]);
  });
});

describe("countByFilter", () => {
  it("считает каждый раздел", () => {
    expect(countByFilter(entries)).toEqual({ all: 4, mine: 2, received: 2, done: 2 });
  });
});

describe("isChecklistFilter", () => {
  it("узнаёт свои значения, остальное отсекает (значение приходит из памяти браузера)", () => {
    expect(isChecklistFilter("mine")).toBe(true);
    expect(isChecklistFilter("nope")).toBe(false);
    expect(isChecklistFilter(null)).toBe(false);
  });
});

describe("pickForHome", () => {
  it("невыполненные впереди выполненных, порядок внутри групп сохраняется", () => {
    expect(pickForHome(entries, 4).map((item) => item.id)).toEqual(["own-open", "got-new", "own-done", "got-done"]);
  });

  it("не больше лимита", () => {
    expect(pickForHome(entries, 2).map((item) => item.id)).toEqual(["own-open", "got-new"]);
  });

  it("выполненные показываются, если невыполненных нет", () => {
    expect(pickForHome([entries[1]], 2).map((item) => item.id)).toEqual(["own-done"]);
  });
});
