/**
 * Заглушка вместо фото объекта: одна из трёх SVG-сцен (крыша, фасад, водосток).
 * Это украшение экрана, не данные — в базе колонки под него нет,
 * поэтому сцена выбирается детерминированно по id.
 */
export type SiteScene = "roof" | "facade" | "gutter";

const SCENES: readonly SiteScene[] = ["roof", "facade", "gutter"];

/** Один и тот же id всегда даёт ту же сцену. */
export function sceneForId(id: string): SiteScene {
  let hash = 0;

  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }

  return SCENES[hash % SCENES.length];
}
