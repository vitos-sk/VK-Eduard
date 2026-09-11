import { describe, expect, it } from "vitest";

import { buildHoursChartData, getPeriodRange } from "./period";

describe("getPeriodRange", () => {
  it("місяць — від 1 до останнього числа", () => {
    const { from, to } = getPeriodRange("month", new Date("2026-09-11T00:00:00"));
    expect(from.toISOString().slice(0, 10)).toBe("2026-09-01");
    expect(to.toISOString().slice(0, 10)).toBe("2026-09-30");
  });

  it("квартал — 3 місяці, що містять reference", () => {
    const { from, to } = getPeriodRange("quarter", new Date("2026-09-11T00:00:00"));
    expect(from.toISOString().slice(0, 10)).toBe("2026-07-01");
    expect(to.toISOString().slice(0, 10)).toBe("2026-09-30");
  });

  it("рік — з 1 січня по 31 грудня", () => {
    const { from, to } = getPeriodRange("year", new Date("2026-09-11T00:00:00"));
    expect(from.toISOString().slice(0, 10)).toBe("2026-01-01");
    expect(to.toISOString().slice(0, 10)).toBe("2026-12-31");
  });
});

describe("buildHoursChartData", () => {
  it("місяць — по днях, підписи це номер дня", () => {
    const points = buildHoursChartData("month", new Date("2026-09-11T00:00:00"), [
      { work_date: "2026-09-01", total_minutes: 60 },
      { work_date: "2026-09-01", total_minutes: 30 },
      { work_date: "2026-09-30", total_minutes: 120 },
    ]);

    expect(points).toHaveLength(30);
    expect(points[0]).toEqual({ label: "01", minutes: 90 });
    expect(points[29]).toEqual({ label: "30", minutes: 120 });
    expect(points[1]).toEqual({ label: "02", minutes: 0 });
  });

  it("рік — по місяцях, підписи це скорочена назва місяця", () => {
    const points = buildHoursChartData("year", new Date("2026-09-11T00:00:00"), [
      { work_date: "2026-01-15", total_minutes: 480 },
      { work_date: "2026-01-20", total_minutes: 60 },
      { work_date: "2026-09-05", total_minutes: 240 },
    ]);

    expect(points).toHaveLength(12);
    expect(points[0]).toEqual({ label: "Січ", minutes: 540 });
    expect(points[8]).toEqual({ label: "Вер", minutes: 240 });
    expect(points[1]).toEqual({ label: "Лют", minutes: 0 });
  });

  it("квартал — по тижнях (понеділок — початок тижня)", () => {
    const points = buildHoursChartData("quarter", new Date("2026-09-11T00:00:00"), [
      { work_date: "2026-07-01", total_minutes: 480 },
    ]);

    expect(points.length).toBeGreaterThan(0);
    expect(points.reduce((sum, point) => sum + point.minutes, 0)).toBe(480);
  });

  it("відкрита зміна (total_minutes: null) не ламає суму", () => {
    const points = buildHoursChartData("month", new Date("2026-09-11T00:00:00"), [
      { work_date: "2026-09-01", total_minutes: null },
    ]);

    expect(points[0]).toEqual({ label: "01", minutes: 0 });
  });
});
