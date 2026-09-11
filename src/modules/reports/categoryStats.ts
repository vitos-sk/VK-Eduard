import type { SiteReportWithPhotos, WorkCategory } from "./types";

export interface CategoryStat {
  id: string;
  label: string;
  count: number;
}

/**
 * Розподіл звітів по категоріях — «Покрівля · 5», відсортовано за спаданням.
 * Категорія без відповідної назви у довіднику (архівована) пропускається —
 * рахувати лічильник для мітки, якої вже нема, безглуздо.
 */
export function aggregateCategoryStats(
  reports: readonly SiteReportWithPhotos[],
  categories: readonly WorkCategory[],
): CategoryStat[] {
  const labelById = new Map(categories.map((category) => [category.id, category.label] as const));
  const counts = new Map<string, number>();

  for (const report of reports) {
    for (const categoryId of report.category_ids) {
      counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([id, count]) => ({ id, label: labelById.get(id) ?? "", count }))
    .filter((stat) => stat.label !== "")
    .sort((a, b) => b.count - a.count);
}
