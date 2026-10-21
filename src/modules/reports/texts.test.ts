import { describe, expect, it } from "vitest";

import { LOCALES } from "@/lib/i18n/locales";

import { reportCreatedPushText, reportUrl } from "./texts";

describe("reportCreatedPushText", () => {
  it("на каждом языке есть заголовок, а в тексте — имя автора и объект", () => {
    for (const locale of LOCALES) {
      const text = reportCreatedPushText(locale, { name: "Іван Петренко", site: "Вулиця Лесі 5" });

      expect(text.title.length).toBeGreaterThan(0);
      expect(text.body).toContain("Іван Петренко");
      expect(text.body).toContain("Вулиця Лесі 5");
    }
  });

  it("отчёт без объекта — только имя, без висящего разделителя", () => {
    expect(reportCreatedPushText("uk", { name: "Іван", site: null }).body).toBe("Іван");
    expect(reportCreatedPushText("uk", { name: "Іван", site: "  " }).body).toBe("Іван");
  });

  it("неизвестный язык из базы — украинский", () => {
    expect(reportCreatedPushText("xx", { name: "Іван", site: null })).toEqual(
      reportCreatedPushText("uk", { name: "Іван", site: null }),
    );
  });

  it("очень длинное название объекта обрезается", () => {
    const text = reportCreatedPushText("uk", { name: "Іван", site: "а".repeat(500) });

    expect(text.body.length).toBeLessThanOrEqual(140);
  });

  it("по нажатию открывается этот отчёт", () => {
    expect(reportUrl("abc")).toBe("/reports/abc");
  });
});
