import { describe, expect, it } from "vitest";

import { countProgress, isComplete } from "./progress";

describe("countProgress", () => {
  it("считает отмеченные и все пункты", () => {
    const items = [{ done_at: "2026-10-15T07:00:00Z" }, { done_at: null }, { done_at: "2026-10-15T07:05:00Z" }];

    expect(countProgress(items)).toEqual({ done: 2, total: 3 });
  });

  it("пустой список — 0 из 0", () => {
    expect(countProgress([])).toEqual({ done: 0, total: 0 });
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
