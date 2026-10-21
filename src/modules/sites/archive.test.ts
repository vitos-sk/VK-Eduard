import { describe, expect, it } from "vitest";

import { isSiteArchived } from "./archive";

describe("isSiteArchived", () => {
  it("завершённый объект — в архиве сам, даже без отметки archived_at", () => {
    expect(isSiteArchived({ archived_at: null, status: "completed" })).toBe(true);
  });

  it("объект, архивированный руками, остаётся в архиве при любом статусе", () => {
    for (const status of ["not_started", "in_progress", "paused", "completed"]) {
      expect(isSiteArchived({ archived_at: "2026-10-01T10:00:00Z", status })).toBe(true);
    }
  });

  it("действующие объекты (не начат, в работе, пауза) в архив не попадают", () => {
    for (const status of ["not_started", "in_progress", "paused"]) {
      expect(isSiteArchived({ archived_at: null, status })).toBe(false);
    }
  });
});
