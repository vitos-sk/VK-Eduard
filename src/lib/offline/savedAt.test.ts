import { describe, expect, it } from "vitest";

import { formatSavedAt } from "./savedAt";

// Часовой пояс задан в vitest.config.ts (Europe/Kyiv), поэтому локальные даты ниже стабильны.
const saved = new Date(2026, 9, 20, 14, 32).getTime();

describe("formatSavedAt", () => {
  it("в тот же день — только время", () => {
    const now = new Date(2026, 9, 20, 18, 0).getTime();

    expect(formatSavedAt(saved, now, "uk")).toBe("14:32");
  });

  it("раньше — день, месяц и время, на языке интерфейса", () => {
    const now = new Date(2026, 9, 21, 9, 0).getTime();

    expect(formatSavedAt(saved, now, "uk")).toBe("20 жовтня, 14:32");
    expect(formatSavedAt(saved, now, "en")).toBe("20 October, 14:32");
    expect(formatSavedAt(saved, now, "nl")).toBe("20 oktober, 14:32");
  });
});
