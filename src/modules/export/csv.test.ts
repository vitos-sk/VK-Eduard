import { describe, expect, it } from "vitest";

import { uk } from "@/lib/i18n";
import { en } from "@/lib/i18n/en";
import { nl } from "@/lib/i18n/nl";

import { buildCsv, csvDelimiter, csvNumber, toHours } from "./csv";
import type { ExportRow } from "./types";

const ROW: ExportRow = {
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
  description: 'Dak, "plat"',
  photoCount: 0,
};

describe("csv", () => {
  it("часы — десятичными числами", () => {
    expect(toHours(450)).toBe(7.5);
    expect(toHours(65)).toBe(1.08);
  });

  it("разделитель и десятичный знак — по языку", () => {
    expect(csvDelimiter("en")).toBe(",");
    expect(csvDelimiter("nl")).toBe(";");
    expect(csvNumber(7.5, "en")).toBe("7.50");
    expect(csvNumber(7.5, "uk")).toBe("7,50");
  });

  it("украинский: «;», запятая в числах, шапка на языке интерфейса", () => {
    const lines = buildCsv([ROW], uk, "uk").slice(1).split("\r\n");

    expect(lines[0]).toBe("Дата;День;Робітник;Об'єкт;Початок;Кінець;Перерва (хв);Години;Понад норму (год);Опис");
    expect(lines[1]).toBe('2026-10-05;Mon;Eduard;Knokke-Heist;07:30;16:00;30;8,00;0,50;"Dak, ""plat"""');
  });

  it("английский: запятая-разделитель и точка в числах", () => {
    const lines = buildCsv([ROW], en, "en").slice(1).split("\r\n");

    expect(lines[0]).toBe("Date,Day,Worker,Site,Start,End,Break (min),Hours,Overtime (h),Description");
    expect(lines[1]).toBe('2026-10-05,Mon,Eduard,Knokke-Heist,07:30,16:00,30,8.00,0.50,"Dak, ""plat"""');
  });

  it("нидерландский: шапка по-нидерландски", () => {
    expect(buildCsv([], nl, "nl").slice(1)).toBe("Datum;Dag;Medewerker;Project;Begin;Einde;Pauze (min);Uren;Overuren (u);Beschrijving");
  });

  it("начинается с BOM, смена без конца — пустые часы", () => {
    const csv = buildCsv([{ ...ROW, totalMinutes: null, end: "…" }], en, "en");

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.split("\r\n")[1]).toContain(",30,,,");
  });
});
