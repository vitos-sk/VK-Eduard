import { SITE_GRADIENT_VARS } from "@/design-system/tokens";

/**
 * Детерминированный градиент для миниатюры объекта (`Thumb`) — та же
 * зелёная палитра, что и у мок-объектов, только без хранения цвета в базе:
 * это украшение экрана, не данные, и колонки под него нет.
 */
const PALETTE = SITE_GRADIENT_VARS;

/** Тот же id всегда даёт ту же пару цветов. */
export function gradientForId(id: string): readonly [string, string] {
  let hash = 0;

  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }

  return PALETTE[hash % PALETTE.length];
}
