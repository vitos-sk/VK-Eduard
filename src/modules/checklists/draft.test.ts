import { describe, expect, it } from "vitest";

import { ITEMS_MAX, ITEM_MAX, TITLE_MAX, cleanItems, mapItemIds, validateDraft } from "./draft";

const item = (text: string, id: string | null = null) => ({ id, text });

describe("cleanItems", () => {
  it("убирает пустые строки и лишние пробелы, порядок сохраняет", () => {
    const result = cleanItems([item("  Бус  "), item("   "), item("Газовий   пальник"), item("")]);

    expect(result.map((entry) => entry.text)).toEqual(["Бус", "Газовий пальник"]);
  });

  it("режет слишком длинный пункт", () => {
    expect(cleanItems([item("я".repeat(ITEM_MAX + 50))])[0].text).toHaveLength(ITEM_MAX);
  });

  it("не теряет id уже сохранённого пункта", () => {
    expect(cleanItems([item("Бус", "abc")])[0].id).toBe("abc");
  });
});

describe("validateDraft", () => {
  it("принимает название и пункты", () => {
    const result = validateDraft({ title: " Перед виїздом ", items: [item("Бус")] });

    expect(result).toEqual({ ok: true, draft: { title: "Перед виїздом", items: [item("Бус")] } });
  });

  it("без названия — ошибка title", () => {
    expect(validateDraft({ title: "   ", items: [item("Бус")] })).toEqual({ ok: false, reason: "title" });
  });

  it("без пунктов (или только пустые) — ошибка items", () => {
    expect(validateDraft({ title: "Здача", items: [] })).toEqual({ ok: false, reason: "items" });
    expect(validateDraft({ title: "Здача", items: [item("  ")] })).toEqual({ ok: false, reason: "items" });
  });

  it("слишком много пунктов — ошибка tooMany", () => {
    const many = Array.from({ length: ITEMS_MAX + 1 }, (_, index) => item(`Пункт ${index}`));

    expect(validateDraft({ title: "Довгий", items: many })).toEqual({ ok: false, reason: "tooMany" });
  });

  it("режет слишком длинное название", () => {
    const result = validateDraft({ title: "н".repeat(TITLE_MAX + 10), items: [item("Бус")] });

    expect(result.ok && result.draft.title.length).toBe(TITLE_MAX);
  });
});

describe("mapItemIds", () => {
  it("n-й непустой строке достаётся n-й id; пустые строки пропускаются", () => {
    const rows = [
      { key: 1, text: "Бус" },
      { key: 2, text: "   " },
      { key: 3, text: "Пальник" },
      { key: 4, text: "" },
    ];

    expect([...mapItemIds(rows, ["a", "b"])]).toEqual([
      [1, "a"],
      [3, "b"],
    ]);
  });

  it("если id меньше, чем строк, лишние строки остаются без id", () => {
    expect([...mapItemIds([{ key: 1, text: "Бус" }, { key: 2, text: "Пальник" }], ["a"])]).toEqual([[1, "a"]]);
  });

  it("нет строк — пустой результат", () => {
    expect(mapItemIds([], []).size).toBe(0);
  });
});
