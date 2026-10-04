import { describe, expect, it } from "vitest";

import { categoryLabel, categoryLabelsOf } from "./categoryLabels";
import type { WorkCategory } from "./types";

const CATEGORIES: WorkCategory[] = [
  { id: "epdm", company_id: "c1", label: "EPDM", sort_order: 0, archived_at: null, is_other: false },
  { id: "other", company_id: "c1", label: "Інше", sort_order: 1, archived_at: null, is_other: true },
];

describe("categoryLabel", () => {
  it("додає вписаний текст до «Інше»", () => {
    expect(categoryLabel(CATEGORIES[1], " Прибирали територію ")).toBe("Інше: Прибирали територію");
  });

  it("лишає «Інше» без тексту як є, а звичайну категорію — без тексту", () => {
    expect(categoryLabel(CATEGORIES[1], "")).toBe("Інше");
    expect(categoryLabel(CATEGORIES[0], "щось")).toBe("EPDM");
  });
});

describe("categoryLabelsOf", () => {
  it("збирає підписи в порядку вибору і пропускає невідомі категорії", () => {
    const labels = categoryLabelsOf(
      { category_ids: ["other", "gone", "epdm"], other_text: "Їздили за матеріалами" },
      CATEGORIES,
    );

    expect(labels).toEqual(["Інше: Їздили за матеріалами", "EPDM"]);
  });
});
