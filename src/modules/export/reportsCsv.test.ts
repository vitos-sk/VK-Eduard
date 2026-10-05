import { describe, expect, it } from "vitest";

import { uk } from "@/lib/i18n";
import { buildReportsCsv } from "./reportsCsv";

describe("buildReportsCsv", () => {
  it("будує CSV з BOM і шапкою", () => {
    const csv = buildReportsCsv([
      { date: "01.09", worker: "Едуард", site: "Об'єкт А", categories: "Покрівля; Демонтаж", description: "Опис", problem: "Чекали матеріал", photoCount: 2 },
    ], uk, "uk");

    expect(csv.startsWith("﻿Дата;")).toBe(true);
    expect(csv).toContain("01.09;Едуард;Об'єкт А;Покрівля; Демонтаж;Опис;Чекали матеріал;2".replace("Покрівля; Демонтаж", '"Покрівля; Демонтаж"'));
  });

  it("екранує поля з комою чи лапками", () => {
    const csv = buildReportsCsv([
      { date: "01.09", worker: "Едуард", site: "-", categories: "-", description: 'Опис з "лапками", комою', problem: "", photoCount: 0 },
    ], uk, "uk");

    expect(csv).toContain('"Опис з ""лапками"", комою"');
  });
});
