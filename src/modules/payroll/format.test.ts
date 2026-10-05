import { describe, expect, it } from "vitest";

import { buildPayrollText, formatDe, payrollAmount, payrollLine, payrollPeriod, type PayrollEntry } from "./format";

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
  it("период — первый и последний день месяца по-немецки", () => {
    expect(payrollPeriod(new Date(2026, 9, 15))).toBe("01.–31. Oktober 2026");
    expect(payrollPeriod(new Date(2026, 1, 3))).toBe("01.–28. Februar 2026");
  });

  it("строка смены: дата, день недели, время, перерыв, объект", () => {
    expect(payrollLine(ENTRIES[0])).toBe("01.10. Do. · 10:00–12:00 · -10min · Freiburg");
    expect(payrollLine(ENTRIES[1])).toBe("01.10. Do. · 16:50–17:45 · Freiburg");
    expect(payrollLine(entry({ site_name: null }))).toBe("01.10. Do. · 10:00–12:00");
  });

  it("числа — по-немецки", () => {
    expect(formatDe(15)).toBe("15,00");
    expect(formatDe(166.25)).toBe("166,25");
  });

  it("собирает расчёт ровно в заданном формате", () => {
    const text = buildPayrollText({
      entries: ENTRIES,
      monthDate: new Date(2026, 9, 1),
      people: [{ id: "u1", name: "Eduard" }],
      rate: 15,
      showNames: false,
    });

    expect(text).toBe(
      [
        "Lohnabrechnung 01.–31. Oktober 2026",
        "",
        "01.10. Do. · 10:00–12:00 · -10min · Freiburg",
        "01.10. Do. · 16:50–17:45 · Freiburg",
        "02.10. Fr. · 07:20–11:00 · Freiburg",
        "05.10. Mo. · 07:30–12:20 · -10min · Freiburg",
        "",
        "Gesamt: 11:05 h",
        "Stundenlohn: 15,00 €/h",
        "Lohn gesamt: 166,25 €",
      ].join("\n"),
    );
  });

  it("без ставки — только часы", () => {
    const text = buildPayrollText({ entries: ENTRIES, monthDate: new Date(2026, 9, 1), people: [{ id: "u1", name: "E" }], rate: null, showNames: false });

    expect(text.endsWith("Gesamt: 11:05 h")).toBe(true);
    expect(text).not.toContain("Stundenlohn");
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
    });

    expect(text).toContain("Mitarbeiter: Eduard");
    expect(text).toContain("Mitarbeiter: Andriy");
    expect(text).toContain("Keine Einträge");
    expect(text).toContain("Alle zusammen\nGesamt: 12:05 h");
  });

  it("незавершённые смены в расчёт не попадают", () => {
    const text = buildPayrollText({
      entries: [entry({ ended_at: null, total_minutes: null })],
      monthDate: new Date(2026, 9, 1),
      people: [{ id: "u1", name: "E" }],
      rate: 10,
      showNames: false,
    });

    expect(text).toContain("Keine Einträge");
  });

  it("сумма к выплате", () => {
    expect(payrollAmount(ENTRIES, [{ id: "u1", name: "E" }], 15)).toBeCloseTo(166.25, 5);
    expect(payrollAmount(ENTRIES, [{ id: "u1", name: "E" }], null)).toBeNull();
  });
});
