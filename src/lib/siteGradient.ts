/**
 * Детерминированный градиент для миниатюры объекта (`Thumb`) — та же
 * зелёная палитра, что и у мок-объектов, только без хранения цвета в базе:
 * это украшение экрана, не данные, и колонки под него нет.
 */
const PALETTE: readonly (readonly [string, string])[] = [
  ["#3B5C2E", "#1B2C15"],
  ["#5A5A24", "#2B2B11"],
  ["#2E5541", "#15281F"],
  ["#4A5C2A", "#232C14"],
  ["#2F4E3C", "#16241C"],
];

/** Тот же id всегда даёт ту же пару цветов. */
export function gradientForId(id: string): readonly [string, string] {
  let hash = 0;

  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }

  return PALETTE[hash % PALETTE.length];
}
