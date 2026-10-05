import { describe, expect, it } from "vitest";

import { uk } from "@/lib/i18n";
import { buildPdf } from "./pdf";

describe("buildPdf", () => {
  it("собирает PDF с украинскими буквами и встраивает Golos Text и JetBrains Mono", async () => {
    const pdf = await buildPdf(
      [
        {
          dateKey: "2026-10-08",
          weekday: "Чт",
          date: "08.10.2026",
          worker: "Ґанна Єгорівна",
          site: "Об'єкт «Їжак»",
          start: "07:30",
          end: "15:45",
          breakMinutes: 30,
          totalMinutes: 465,
          workedMinutes: 465,
          overtimeMinutes: 0,
          description: "Водостоки, жерстяні роботи",
          photoCount: 0,
        },
      ],
      { companyName: "VK group", periodTitle: "Жовтень 2026" },
      uk,
    );

    const text = pdf.toString("latin1");

    expect(text.startsWith("%PDF")).toBe(true);
    expect(text).toMatch(/GolosText/);
    expect(text).toMatch(/JetBrainsMono/);
  });
});
