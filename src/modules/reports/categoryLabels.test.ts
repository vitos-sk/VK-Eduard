import { describe, expect, it } from "vitest";

import { uk } from "@/lib/i18n";
import { en } from "@/lib/i18n/en";
import { canonicalCategoryLabel, categoryLabel, categoryLabelsOf, categoryName } from "./categoryLabels";
import type { WorkCategory } from "./types";

const CATEGORIES: WorkCategory[] = [
  { id: "epdm", company_id: "c1", label: "EPDM", sort_order: 0, archived_at: null, is_other: false },
  { id: "other", company_id: "c1", label: "Інше", sort_order: 1, archived_at: null, is_other: true },
];

describe("categoryLabel", () => {
  it("додає вписаний текст до «Інше»", () => {
    expect(categoryLabel(CATEGORIES[1], " Прибирали територію ", uk)).toBe("Інше: Прибирали територію");
  });

  it("лишає «Інше» без тексту як є, а звичайну категорію — без тексту", () => {
    expect(categoryLabel(CATEGORIES[1], "", uk)).toBe("Інше");
    expect(categoryLabel(CATEGORIES[0], "щось", uk)).toBe("EPDM");
  });
});

describe("categoryLabelsOf", () => {
  it("збирає підписи в порядку вибору і пропускає невідомі категорії", () => {
    const labels = categoryLabelsOf(
      { category_ids: ["other", "gone", "epdm"], other_text: "Їздили за матеріалами" },
      CATEGORIES,
      uk,
    );

    expect(labels).toEqual(["Інше: Їздили за матеріалами", "EPDM"]);
  });

  it("перекладає стандартні категорії на мову інтерфейсу, власні лишає як є", () => {
    expect(categoryLabel(CATEGORIES[1], "Cleaning", en)).toBe("Other: Cleaning");
    expect(categoryLabel({ label: "Моя категорія", is_other: false }, "", en)).toBe("Моя категорія");
  });
});

describe("categoryName для вида работ объекта", () => {
  it("старое вручную введённое значение приводится к стандартной категории и переводится", () => {
    expect(canonicalCategoryLabel("Плоский дах")).toBe("Плоскі дахи");
    expect(categoryName("Плоский дах", en)).toBe("Flat roofs");
    expect(categoryName(" плоская крыша ", en)).toBe("Flat roofs");
    expect(categoryName("Плоскі дахи", uk)).toBe("Плоскі дахи");
  });

  it("своё значение, которого нет в справочнике, не меняется", () => {
    expect(canonicalCategoryLabel("Моя категорія")).toBeNull();
    expect(categoryName("Моя категорія", en)).toBe("Моя категорія");
  });
});
