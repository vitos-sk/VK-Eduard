import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { uk } from "@/lib/i18n";
import { en } from "@/lib/i18n/en";

import { buildXlsx } from "./xlsx";
import type { ExportRow } from "./types";

function row(partial: Partial<ExportRow>): ExportRow {
  return {
    dateKey: "2026-10-05",
    weekday: "Mon",
    date: "05.10",
    worker: "Eduard",
    site: "Knokke-Heist",
    start: "07:30",
    end: "16:00",
    breakMinutes: 30,
    totalMinutes: 480,
    workedMinutes: 450,
    overtimeMinutes: 30,
    description: "Dak",
    photoCount: 0,
    ...partial,
  };
}

async function load(rows: ExportRow[], t = en, locale: "en" | "uk" = "en") {
  const buffer = await buildXlsx(rows, { companyName: "VK group", periodTitle: "10.2026" }, t, locale);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  return workbook;
}

describe("buildXlsx", () => {
  it("две вкладки на языке интерфейса", async () => {
    expect((await load([row({})])).worksheets.map((sheet) => sheet.name)).toEqual(["Hours", "Summary"]);
    expect((await load([row({})], uk, "uk")).worksheets.map((sheet) => sheet.name)).toEqual(["Години", "Підсумок"]);
  });

  it("смены — настоящие даты, время и числа; внизу итог формулой", async () => {
    const sheet = (await load([row({}), row({ dateKey: "2026-10-06", totalMinutes: 270, overtimeMinutes: 0 })])).getWorksheet("Hours")!;

    expect(sheet.getRow(1).values).toContain("Hours");
    expect(sheet.getCell("A2").value).toEqual(new Date(Date.UTC(2026, 9, 5)));
    // время — настоящее значение (Excel отдаёт его как дату 1899-12-30 + доля суток)
    expect((sheet.getCell("E2").value as Date).toISOString().slice(11, 16)).toBe("07:30");
    expect(sheet.getCell("E2").numFmt).toBe("hh:mm");
    expect(sheet.getCell("H2").value).toBe(8);
    expect(sheet.getCell("H3").value).toBe(4.5);

    const total = sheet.getCell("H4").value as { formula: string; result: number };
    expect(total.formula).toBe("SUBTOTAL(109,H2:H3)");
    expect(total.result).toBe(12.5);
  });

  it("итоги по сотрудникам: дни, часы формулами, общий итог", async () => {
    const summary = (
      await load([
        row({}),
        row({ dateKey: "2026-10-06", totalMinutes: 240, overtimeMinutes: 0 }),
        row({ worker: "Andriy", totalMinutes: 60, overtimeMinutes: 0 }),
      ])
    ).getWorksheet("Summary")!;

    expect(summary.getCell("A2").value).toBe("Andriy");
    expect(summary.getCell("B3").value).toBe(2);
    expect((summary.getCell("C3").value as { result: number }).result).toBe(12);
    expect((summary.getCell("C4").value as { formula: string; result: number }).formula).toBe("SUM(C2:C3)");
    expect((summary.getCell("C4").value as { result: number }).result).toBe(13);
  });

  it("пустой период не ломает файл", async () => {
    expect((await load([])).worksheets).toHaveLength(2);
  });
});
