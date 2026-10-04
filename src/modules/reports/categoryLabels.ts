import type { SiteReport, WorkCategory } from "./types";

/** Максимум символів у тексті «Інше» — звіт, а не есе. */
export const OTHER_TEXT_MAX_LENGTH = 200;

/** Підпис категорії: для «Інше» — із вписаним текстом («Інше: Прибирали територію»). */
export function categoryLabel(
  category: Pick<WorkCategory, "label" | "is_other">,
  otherText: string,
): string {
  const text = otherText.trim();

  return category.is_other && text !== "" ? `${category.label}: ${text}` : category.label;
}

/** Підписи категорій звіту в порядку `category_ids`; невідомі (архівовані) пропускаються. */
export function categoryLabelsOf(
  report: Pick<SiteReport, "other_text"> & { category_ids: readonly string[] },
  categories: readonly WorkCategory[],
): string[] {
  const byId = new Map(categories.map((category) => [category.id, category] as const));

  return report.category_ids
    .map((id) => byId.get(id))
    .filter((category): category is WorkCategory => category !== undefined)
    .map((category) => categoryLabel(category, report.other_text));
}
