import { describe, expect, it } from "vitest";

import { dayLabel, listTimeLabel, startsNewDay } from "./time";

const labels = { today: "Сьогодні", yesterday: "Вчора" };
const now = new Date(2026, 9, 15, 14, 30);

describe("dayLabel", () => {
  it("сегодня и вчера — словами", () => {
    expect(dayLabel(new Date(2026, 9, 15, 8, 0), now, labels, "uk")).toBe("Сьогодні");
    expect(dayLabel(new Date(2026, 9, 14, 23, 59), now, labels, "uk")).toBe("Вчора");
  });

  it("раньше — числом и месяцем", () => {
    expect(dayLabel(new Date(2026, 9, 12, 8, 0), now, labels, "uk")).toMatch(/12/);
  });
});

describe("listTimeLabel", () => {
  it("сегодня — время сообщения", () => {
    expect(listTimeLabel(new Date(2026, 9, 15, 9, 5), now, labels, "uk")).toBe("09:05");
  });

  it("вчера — «Вчора»", () => {
    expect(listTimeLabel(new Date(2026, 9, 14, 9, 5), now, labels, "uk")).toBe("Вчора");
  });
});

describe("startsNewDay", () => {
  it("первое сообщение всегда открывает день", () => {
    expect(startsNewDay(null, new Date(2026, 9, 15))).toBe(true);
  });

  it("в тот же день разделитель не нужен, на следующий — нужен", () => {
    expect(startsNewDay(new Date(2026, 9, 15, 8), new Date(2026, 9, 15, 20))).toBe(false);
    expect(startsNewDay(new Date(2026, 9, 15, 23, 50), new Date(2026, 9, 16, 0, 10))).toBe(true);
  });
});
