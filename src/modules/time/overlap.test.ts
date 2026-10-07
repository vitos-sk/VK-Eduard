import { describe, expect, it } from "vitest";

import { findOverlap, shiftsOverlap, type ShiftSpan } from "./overlap";

const shift = (workDate: string, startedAt: string, endedAt: string | null): ShiftSpan => ({
  workDate,
  startedAt,
  endedAt,
});

describe("shiftsOverlap", () => {
  it("одна и та же смена пересекается сама с собой (дубль)", () => {
    const a = shift("2026-10-05", "07:00", "16:00");

    expect(shiftsOverlap(a, { ...a })).toBe(true);
  });

  it("принимает время и как HH:mm, и как HH:mm:ss из базы", () => {
    expect(
      shiftsOverlap(shift("2026-10-05", "07:00", "16:00"), shift("2026-10-05", "07:00:00", "16:00:00")),
    ).toBe(true);
  });

  it("частичное пересечение", () => {
    expect(
      shiftsOverlap(shift("2026-10-05", "07:00", "12:00"), shift("2026-10-05", "11:00", "15:00")),
    ).toBe(true);
  });

  it("одна смена целиком внутри другой", () => {
    expect(
      shiftsOverlap(shift("2026-10-05", "07:00", "16:00"), shift("2026-10-05", "09:00", "10:00")),
    ).toBe(true);
  });

  it("встык (конец = начало) — не пересечение", () => {
    expect(
      shiftsOverlap(shift("2026-10-05", "07:00", "12:00"), shift("2026-10-05", "12:00", "16:00")),
    ).toBe(false);
  });

  it("две смены в один день без пересечения (два объекта)", () => {
    expect(
      shiftsOverlap(shift("2026-10-05", "07:00", "11:00"), shift("2026-10-05", "13:00", "17:00")),
    ).toBe(false);
  });

  it("в разные дни не пересекаются", () => {
    expect(
      shiftsOverlap(shift("2026-10-05", "07:00", "16:00"), shift("2026-10-06", "07:00", "16:00")),
    ).toBe(false);
  });

  it("ночная смена заходит на следующий день", () => {
    const night = shift("2026-10-05", "22:00", "06:00");

    expect(shiftsOverlap(night, shift("2026-10-06", "05:00", "08:00"))).toBe(true);
    expect(shiftsOverlap(night, shift("2026-10-06", "06:00", "10:00"))).toBe(false);
    expect(shiftsOverlap(night, shift("2026-10-05", "20:00", "23:00"))).toBe(true);
  });

  it("ночная смена на стыке месяцев и годов", () => {
    expect(
      shiftsOverlap(shift("2026-12-31", "23:00", "02:00"), shift("2027-01-01", "01:00", "03:00")),
    ).toBe(true);
    expect(
      shiftsOverlap(shift("2026-02-28", "23:00", "02:00"), shift("2026-03-01", "02:00", "04:00")),
    ).toBe(false);
  });

  it("незавершённая смена ни с чем не пересекается (у неё нет конца)", () => {
    expect(
      shiftsOverlap(shift("2026-10-05", "07:00", null), shift("2026-10-05", "07:00", "16:00")),
    ).toBe(false);
  });
});

describe("findOverlap", () => {
  const existing = [
    { id: "a", ...shift("2026-10-05", "07:00", "11:00") },
    { id: "b", ...shift("2026-10-05", "13:00", "17:00") },
    { id: "c", ...shift("2026-10-06", "07:00", "16:00") },
  ];

  it("возвращает пересёкшуюся запись", () => {
    expect(findOverlap(shift("2026-10-05", "10:00", "14:00"), existing)?.id).toBe("a");
    expect(findOverlap(shift("2026-10-06", "08:00", "09:00"), existing)?.id).toBe("c");
  });

  it("нет пересечения — null", () => {
    expect(findOverlap(shift("2026-10-05", "11:00", "13:00"), existing)).toBeNull();
    expect(findOverlap(shift("2026-10-07", "07:00", "16:00"), existing)).toBeNull();
  });

  it("при правке запись не пересекается сама с собой", () => {
    expect(findOverlap(shift("2026-10-05", "07:00", "12:00"), existing, "a")).toBeNull();
    expect(findOverlap(shift("2026-10-05", "07:00", "14:00"), existing, "a")?.id).toBe("b");
  });
});
