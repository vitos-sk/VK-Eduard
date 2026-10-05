import type { Dict } from "@/lib/i18n";
import type { SiteReport, WorkCategory } from "./types";

/** Максимум символів у тексті «Інше» — звіт, а не есе. */
export const OTHER_TEXT_MAX_LENGTH = 200;

/**
 * Як цей вид робіт могли вписати вручну (старі об'єкти, російська, однина) → стандартна категорія.
 * Ключі — у нижньому регістрі.
 */
const CATEGORY_ALIASES: Record<string, string> = {
  "плоский дах": "Плоскі дахи",
  "плоская крыша": "Плоскі дахи",
  "плоский дах (плоскі дахи)": "Плоскі дахи",
  "скатний дах": "Скатні дахи",
  "скатный дах": "Скатні дахи",
  "скатная крыша": "Скатні дахи",
  "рубероид": "Рубероїд",
  "черепица": "Дахівка / черепиця",
  "черепиця": "Дахівка / черепиця",
  "дахівка": "Дахівка / черепиця",
  "фасад": "Фасадні роботи",
  "фасадные работы": "Фасадні роботи",
  "жестяные работы": "Жерстяні роботи",
  "водосток": "Водостоки",
  "водостоки": "Водостоки",
  "демонтаж": "Демонтаж",
  "ремонт крыши": "Ремонт даху",
  "ремонт даху": "Ремонт даху",
  "склад": "Склад",
  "дополнительные работы": "Додаткові роботи",
  "другое": "Інше",
};

const STANDARD_LABELS = new Set([
  "Плоскі дахи",
  "Скатні дахи",
  "EPDM",
  "Resitrix",
  "Рубероїд",
  "Дахівка / черепиця",
  "Фасадні роботи",
  "Жерстяні роботи",
  "Водостоки",
  "Демонтаж",
  "Ремонт даху",
  "Склад",
  "Додаткові роботи",
  "Інше",
]);

/** Стандартна (українська) назва категорії для довільного запису, або `null`, якщо це власна назва. */
export function canonicalCategoryLabel(label: string): string | null {
  const trimmed = label.trim();

  if (STANDARD_LABELS.has(trimmed)) return trimmed;

  return CATEGORY_ALIASES[trimmed.toLowerCase()] ?? null;
}

/**
 * Назва категорії мовою інтерфейсу. У базі стандартні категорії лежать українською —
 * вона слугує ключем; власні категорії шефа, яких у словнику нема, лишаються як введені.
 */
export function categoryName(label: string, t: Dict): string {
  const canonical = canonicalCategoryLabel(label);

  return canonical ? ((t.categoryNames as Record<string, string>)[canonical] ?? label) : label;
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
