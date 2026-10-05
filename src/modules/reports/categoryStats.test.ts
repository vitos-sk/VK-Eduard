import { describe, expect, it } from "vitest";

import { uk } from "@/lib/i18n";
import { aggregateCategoryStats } from "./categoryStats";
import type { SiteReportWithPhotos, WorkCategory } from "./types";

const CATEGORIES: WorkCategory[] = [
  { id: "roof", company_id: "c1", label: "Покрівля", sort_order: 0, archived_at: null, is_other: false },
  { id: "demo", company_id: "c1", label: "Демонтаж", sort_order: 1, archived_at: null, is_other: false },
];

function report(categoryIds: string[]): SiteReportWithPhotos {
  return {
    id: "r1",
    client_id: "cl1",
    company_id: "c1",
    author_id: "a1",
    site_id: "s1",
    work_date: "2026-09-01",
    description: "",
    other_text: "",
    created_at: "",
    updated_at: "",
    report_photos: [],
    category_ids: categoryIds,
  };
}

describe("aggregateCategoryStats", () => {
  it("рахує кількість звітів на категорію і сортує за спаданням", () => {
    const stats = aggregateCategoryStats(
      [report(["roof"]), report(["roof", "demo"]), report(["roof"])],
      CATEGORIES,
      uk,
    );

    expect(stats).toEqual([
      { id: "roof", label: "Покрівля", count: 3 },
      { id: "demo", label: "Демонтаж", count: 1 },
    ]);
  });

  it("пропускає категорію без мітки у довіднику (архівована)", () => {
    const stats = aggregateCategoryStats([report(["ghost"])], CATEGORIES, uk);
    expect(stats).toEqual([]);
  });
});
