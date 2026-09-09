import type { SiteObject } from "@/lib/types";

/**
 * Пять объектов из раздела 5 плана.
 * Фотографии не тянем из интернета — `Thumb` рисует градиент с инициалами,
 * пара цветов лежит в поле `gradient`.
 */
export const objects: readonly SiteObject[] = [
  {
    id: "obj-reimond",
    name: "Reimond",
    address: "Freiburg, Schlossgasse 24",
    status: "in_progress",
    photosCount: 8,
    reportsCount: 2,
    gradient: ["#3B5C2E", "#1B2C15"],
  },
  {
    id: "obj-villa",
    name: "Villa Project",
    address: "Brussels, Belgium",
    status: "in_progress",
    photosCount: 6,
    reportsCount: 1,
    gradient: ["#5A5A24", "#2B2B11"],
  },
  {
    id: "obj-hanser",
    name: "Hanser House",
    address: "Basel, Switzerland",
    status: "not_started",
    photosCount: 0,
    reportsCount: 0,
    gradient: ["#2E5541", "#15281F"],
  },
  {
    id: "obj-loretto",
    name: "Loretto",
    address: "Freiburg, Lorettostraße 3",
    status: "not_started",
    photosCount: 0,
    reportsCount: 0,
    gradient: ["#4A5C2A", "#232C14"],
  },
  {
    id: "obj-angelverein",
    name: "Angelverein Riegel",
    address: "Riegel am Kaiserstuhl",
    status: "not_started",
    photosCount: 0,
    reportsCount: 0,
    gradient: ["#2F4E3C", "#16241C"],
  },
] as const;

/** Быстрый доступ по id — пригодится в формах и карточках отчётов. */
export function getObjectById(id: string): SiteObject | undefined {
  return objects.find((object) => object.id === id);
}

/** Первые три объекта — блок «Мої об'єкти» на главной. */
export const homeObjects: readonly SiteObject[] = [
  objects[0],
  objects[1],
  objects[3],
];
