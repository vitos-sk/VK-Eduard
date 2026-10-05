import type { Dict } from "@/lib/i18n";
import type { SiteReport, WorkCategory } from "./types";

/** Максимум символів у тексті «Інше» — звіт, а не есе. */
export const OTHER_TEXT_MAX_LENGTH = 200;

/**
 * Назва категорії мовою інтерфейсу. У базі стандартні категорії лежать українською —
 * вона слугує ключем; власні категорії шефа, яких у словнику нема, лишаються як введені.
 */
export function categoryName(label: string, t: Dict): string {
  return (t.categoryNames as Record<string, string>)[label] ?? label;
}

/** Підпис категорії: для «Інше» — із вписаним текстом («Інше: Прибирали територію»). */
export function categoryLabel(
  category: Pick<WorkCategory, "label" | "is_other">,
  otherText: string,
  t: Dict,
): string {
  const text = otherText.trim();
  const name = categoryName(category.label, t);

  return category.is_other && text !== "" ? `${name}: ${text}` : name;
}

/** Підписи категорій звіту в порядку `category_ids`; невідомі (архівовані) пропускаються. */
export function categoryLabelsOf(
  report: Pick<SiteReport, "other_text"> & { category_ids: readonly string[] },
  categories: readonly WorkCategory[],
  t: Dict,
): string[] {
  const byId = new Map(categories.map((category) => [category.id, category] as const));

  return report.category_ids
    .map((id) => byId.get(id))
    .filter((category): category is WorkCategory => category !== undefined)
    .map((category) => categoryLabel(category, report.other_text, t));
}
