import { describe, expect, it } from "vitest";

import { buildReportsCsv } from "./reportsCsv";

describe("buildReportsCsv", () => {
  it("будує CSV з BOM і шапкою", () => {
    const csv = buildReportsCsv([
      { date: "01.09", worker: "Едуард", site: "Об'єкт А", categories: "Покрівля; Демонтаж", description: "Опис", photoCount: 2 },
    ]);

    expect(csv.startsWith("﻿Дата,")).toBe(true);
    expect(csv).toContain("01.09,Едуард,Об'єкт А,\"Покрівля; Демонтаж\",Опис,2");
  });

  it("екранує поля з комою чи лапками", () => {
    const csv = buildReportsCsv([
      { date: "01.09", worker: "Едуард", site: "-", categories: "-", description: 'Опис з "лапками", комою', photoCount: 0 },
    ]);

    expect(csv).toContain('"Опис з ""лапками"", комою"');
  });
});
