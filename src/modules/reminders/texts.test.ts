import { describe, expect, it } from "vitest";

import { LOCALES } from "@/lib/i18n/locales";

import { REMINDER_URL, reminderText } from "./texts";

describe("reminderText", () => {
  it("есть текст на каждом языке приложения", () => {
    for (const locale of LOCALES) {
      const text = reminderText(locale);

      expect(text.title.length).toBeGreaterThan(0);
      expect(text.body.length).toBeGreaterThan(0);
    }
  });

  it("неизвестный язык из базы — украинский, а не пустое уведомление", () => {
    expect(reminderText("xx")).toEqual(reminderText("uk"));
  });

  it("по нажатию открывается форма нового отчёта", () => {
    expect(REMINDER_URL).toBe("/reports/new");
  });
});
