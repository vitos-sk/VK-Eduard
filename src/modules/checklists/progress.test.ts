import { describe, expect, it } from "vitest";

import { countProgress, doneByOther, isComplete } from "./progress";

describe("countProgress", () => {
  it("считает отмеченные и все пункты", () => {
    const items = [{ done_at: "2026-10-15T07:00:00Z" }, { done_at: null }, { done_at: "2026-10-15T07:05:00Z" }];

    expect(countProgress(items)).toEqual({ done: 2, total: 3 });
  });

  it("пустой список — 0 из 0", () => {
    expect(countProgress([])).toEqual({ done: 0, total: 0 });
  });
});

describe("doneByOther", () => {
  const item = (over: Partial<{ doneAt: string | null; doneById: string | null; doneByName: string | null }> = {}) => ({
    doneAt: "2026-10-15T07:00:00Z",
    doneById: "other",
    doneByName: "Олег К.",
    ...over,
  });

  it("пункт отметил другой человек — его имя", () => {
    expect(doneByOther(item(), "me")).toBe("Олег К.");
  });

  it("пункт отметил сам человек — подписи нет", () => {
    expect(doneByOther(item({ doneById: "me" }), "me")).toBeNull();
  });

  it("пункт не отмечен — подписи нет, даже если имя осталось", () => {
    expect(doneByOther(item({ doneAt: null }), "me")).toBeNull();
  });

  it("кто отметил, неизвестно (отмечено до появления имён) — подписи нет", () => {
    expect(doneByOther(item({ doneById: null, doneByName: null }), "me")).toBeNull();
  });
});

describe("isComplete", () => {
  it("выполнен, когда отмечено всё", () => {
    expect(isComplete({ done: 3, total: 3 })).toBe(true);
  });

  it("не выполнен, пока есть неотмеченные", () => {
    expect(isComplete({ done: 2, total: 3 })).toBe(false);
  });

  it("пустой чеклист не считается выполненным", () => {
    expect(isComplete({ done: 0, total: 0 })).toBe(false);
  });
});
