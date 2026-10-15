import { describe, expect, it } from "vitest";

import { defaultChecklistTitle } from "./title";

describe("defaultChecklistTitle", () => {
  it("подставляет сегодняшнюю дату на языке интерфейса", () => {
    const now = new Date("2026-10-15T09:00:00Z");

    expect(defaultChecklistTitle("Чеклист · {date}", now, "uk")).toBe("Чеклист · 15 жовтня");
    expect(defaultChecklistTitle("Checklist · {date}", now, "en")).toBe("Checklist · 15 October");
    expect(defaultChecklistTitle("Checklist · {date}", now, "nl")).toBe("Checklist · 15 oktober");
  });

  it("дата по Брюсселю: в полночь по Бельгии сервер в UTC ещё во вчерашнем дне", () => {
    // 22:30 UTC 14 октября = 00:30 15 октября в Брюсселе (летнее время, UTC+2)
    expect(defaultChecklistTitle("Чеклист · {date}", new Date("2026-10-14T22:30:00Z"), "uk")).toBe("Чеклист · 15 жовтня");
  });
});
