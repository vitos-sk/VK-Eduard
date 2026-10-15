/** Пределы совпадают с проверками в базе (`0021_checklists_chats.sql`). */
export const TITLE_MAX = 120;
export const ITEM_MAX = 200;
export const ITEMS_MAX = 50;

/** Пункт в форме: `id` есть у уже сохранённого, у нового — `null`. */
export interface DraftItem {
  id: string | null;
  text: string;
}

export interface ChecklistDraft {
  title: string;
  items: DraftItem[];
}

export type DraftResult =
  | { ok: true; draft: ChecklistDraft }
  | { ok: false; reason: "title" | "items" | "tooMany" };

function squash(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Убирает пустые строки, лишние пробелы и режет слишком длинные пункты. Порядок сохраняется. */
export function cleanItems(items: readonly DraftItem[]): DraftItem[] {
  return items
    .map((item) => ({ id: item.id, text: squash(item.text).slice(0, ITEM_MAX) }))
    .filter((item) => item.text !== "");
}

/** Проверяет форму перед сохранением: название обязательно, нужен хотя бы один пункт, не больше `ITEMS_MAX`. */
export function validateDraft(input: ChecklistDraft): DraftResult {
  const title = squash(input.title).slice(0, TITLE_MAX);
  if (title === "") return { ok: false, reason: "title" };

  const items = cleanItems(input.items);
  if (items.length === 0) return { ok: false, reason: "items" };
  if (items.length > ITEMS_MAX) return { ok: false, reason: "tooMany" };

  return { ok: true, draft: { title, items } };
}
