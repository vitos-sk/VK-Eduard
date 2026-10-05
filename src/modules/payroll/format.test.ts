import { describe, expect, it } from "vitest";

import { uk } from "@/lib/i18n";
import { en } from "@/lib/i18n/en";
import { nl } from "@/lib/i18n/nl";

import { buildPayrollText, formatNumber, payrollAmount, payrollLine, payrollPeriod, type PayrollEntry } from "./format";

function entry(partial: Partial<PayrollEntry>): PayrollEntry {
  return {
    author_id: "u1",
    work_date: "2026-10-01",
    started_at: "10:00:00",
    ended_at: "12:00:00",
    break_start: null,
    break_end: null,
    total_minutes: 120,
    site_name: "Freiburg",
    ...partial,
  };
}

const ENTRIES: PayrollEntry[] = [
  entry({ break_start: "10:00", break_end: "10:10", total_minutes: 110 }),
  entry({ started_at: "16:50:00", ended_at: "17:45:00", total_minutes: 55 }),
  entry({ work_date: "2026-10-02", started_at: "07:20:00", ended_at: "11:00:00", total_minutes: 220 }),
  entry({ work_date: "2026-10-05", started_at: "07:30:00", ended_at: "12:20:00", break_start: "07:30", break_end: "07:40", total_minutes: 280 }),
];

describe("payroll", () => {
  it("период — первый и последний день месяца на языке интерфейса", () => {
    expect(payrollPeriod(new Date(2026, 9, 15), en)).toBe("01.–31. October 2026");
    expect(payrollPeriod(new Date(2026, 1, 3), nl)).toBe("01.–28. februari 2026");
    expect(payrollPeriod(new Date(2026, 9, 15), uk)).toBe("01.–31. жовтня 2026");
  });

  it("строка смены: дата, день недели, время, перерыв, объект", () => {
    expect(payrollLine(ENTRIES[0], en)).toBe("01.10. Thu. · 10:00–12:00 · -10min · Freiburg");
    expect(payrollLine(ENTRIES[1], nl)).toBe("01.10. Do. · 16:50–17:45 · Freiburg");
    expect(payrollLine(entry({ site_name: null }), uk)).toBe("01.10. Чт. · 10:00–12:00");
  });

  it("числа — по правилам языка", () => {
    expect(formatNumber(15, "nl")).toBe("15,00");
    expect(formatNumber(166.25, "uk")).toBe("166,25");
    expect(formatNumber(166.25, "en")).toBe("166.25");
  });

  it("собирает расчёт в заданном формате — английский", () => {
    const text = buildPayrollText({
      entries: ENTRIES,
      monthDate: new Date(2026, 9, 1),
      people: [{ id: "u1", name: "Eduard" }],
      rate: 15,
      showNames: false,
      t: en,
      locale: "en",
    });

    expect(text).toBe(
      [
        "Payroll 01.–31. October 2026",
        "",
        "01.10. Thu. · 10:00–12:00 · -10min · Freiburg",
        "01.10. Thu. · 16:50–17:45 · Freiburg",
        "02.10. Fri. · 07:20–11:00 · Freiburg",
        "05.10. Mon. · 07:30–12:20 · -10min · Freiburg",
        "",
        "Total: 11:05 h",
        "Hourly rate: 15.00 €/h",
        "Total pay: 166.25 €",
      ].join("\n"),
    );
  });

  it("то же на нидерландском и украинском", () => {
    const base = { entries: ENTRIES, monthDate: new Date(2026, 9, 1), people: [{ id: "u1", name: "E" }], rate: 15, showNames: false };

    expect(buildPayrollText({ ...base, t: nl, locale: "nl" })).toContain("Totaal: 11:05 u\nUurloon: 15,00 €/u\nTotaal loon: 166,25 €");
    expect(buildPayrollText({ ...base, t: uk, locale: "uk" })).toContain("Разом: 11:05 год\nСтавка: 15,00 €/год\nДо виплати: 166,25 €");
  });

  it("без ставки — только часы", () => {
    const text = buildPayrollText({ entries: ENTRIES, monthDate: new Date(2026, 9, 1), people: [{ id: "u1", name: "E" }], rate: null, showNames: false, t: en, locale: "en" });

    expect(text.endsWith("Total: 11:05 h")).toBe(true);
    expect(text).not.toContain("Hourly rate");
  });

  it("несколько человек: блок на каждого с именем и общий итог", () => {
    const text = buildPayrollText({
      entries: [...ENTRIES, entry({ author_id: "u2", total_minutes: 60, ended_at: "11:00:00" })],
      monthDate: new Date(2026, 9, 1),
      people: [
        { id: "u1", name: "Eduard" },
        { id: "u2", name: "Andriy" },
        { id: "u3", name: "Nobody" },
      ],
      rate: 10,
      showNames: true,
      t: en,
      locale: "en",
    });

    expect(text).toContain("Employee: Eduard");
    expect(text).toContain("Employee: Andriy");
    expect(text).toContain("All together\nTotal: 12:05 h");
    // у Nobody записей нет — только имя в конце, без пустого блока с нулями
    expect(text.endsWith("\n\nNo entries for: Nobody")).toBe(true);
    expect(text).not.toContain("Employee: Nobody");
  });

  it("незавершённые смены в расчёт не попадают", () => {
    const text = buildPayrollText({
      entries: [entry({ ended_at: null, total_minutes: null })],
      monthDate: new Date(2026, 9, 1),
      people: [{ id: "u1", name: "E" }],
      rate: 10,
      showNames: false,
      t: en,
      locale: "en",
    });

    expect(text).toContain("No entries");
  });

  it("сумма к выплате", () => {
    expect(payrollAmount(ENTRIES, [{ id: "u1", name: "E" }], 15)).toBeCloseTo(166.25, 5);
    expect(payrollAmount(ENTRIES, [{ id: "u1", name: "E" }], null)).toBeNull();
  });

  it("ни у кого нет записей — одна короткая строка с именами", () => {
    const text = buildPayrollText({
      entries: [],
      monthDate: new Date(2026, 9, 1),
      people: [{ id: "a", name: "Ivan" }, { id: "b", name: "Ілля" }],
      rate: 10,
      showNames: true,
      t: uk,
      locale: "uk",
    });

    expect(text).toBe("Розрахунок зарплати 01.–31. жовтня 2026\n\nНемає записів у: Ivan, Ілля");
  });
});
