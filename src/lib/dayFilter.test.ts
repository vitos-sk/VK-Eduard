import { describe, expect, it } from "vitest";

import { activeDay, matchesDay, stepPeriod } from "./dayFilter";

const d = (iso: string) => new Date(`${iso}T00:00:00`);

describe("activeDay", () => {
  it("день из показанного месяца действует", () => {
    expect(activeDay(d("2026-10-15"), d("2026-10-01"))).toEqual(d("2026-10-15"));
  });

  it("день из другого месяца или года отключается", () => {
    expect(activeDay(d("2026-09-30"), d("2026-10-01"))).toBeNull();
    expect(activeDay(d("2025-10-15"), d("2026-10-01"))).toBeNull();
  });

  it("дня нет — остаётся «нет»", () => {
    expect(activeDay(null, d("2026-10-01"))).toBeNull();
  });
});

describe("stepPeriod", () => {
  it("без выбранного дня стрелка листает месяцы", () => {
    expect(stepPeriod(d("2026-10-15"), null, 1)).toEqual({ month: d("2026-11-15"), day: null });
    expect(stepPeriod(d("2026-01-15"), null, -1)).toEqual({ month: d("2025-12-15"), day: null });
  });

  it("с выбранным днём стрелка листает дни, месяц идёт следом", () => {
    expect(stepPeriod(d("2026-10-15"), d("2026-10-15"), 1)).toEqual({ month: d("2026-10-16"), day: d("2026-10-16") });
    expect(stepPeriod(d("2026-10-15"), d("2026-10-15"), -1)).toEqual({ month: d("2026-10-14"), day: d("2026-10-14") });
  });

  it("с границы месяца день переходит в соседний месяц и год", () => {
    expect(stepPeriod(d("2026-10-31"), d("2026-10-31"), 1)).toEqual({ month: d("2026-11-01"), day: d("2026-11-01") });
    expect(stepPeriod(d("2026-01-01"), d("2026-01-01"), -1)).toEqual({ month: d("2025-12-31"), day: d("2025-12-31") });
  });
});

describe("matchesDay", () => {
  it("без дня подходит любая дата", () => {
    expect(matchesDay("2026-10-05", null)).toBe(true);
  });

  it("с днём — только он", () => {
    expect(matchesDay("2026-10-05", d("2026-10-05"))).toBe(true);
    expect(matchesDay("2026-10-06", d("2026-10-05"))).toBe(false);
  });
});
