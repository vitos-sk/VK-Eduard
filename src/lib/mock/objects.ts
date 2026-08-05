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
    gradient: ["#3F4A5A", "#232A35"],
  },
  {
    id: "obj-villa",
    name: "Villa Project",
    address: "Brussels, Belgium",
    status: "in_progress",
    photosCount: 6,
    reportsCount: 1,
    gradient: ["#4A4235", "#262117"],
  },
  {
    id: "obj-hanser",
    name: "Hanser House",
    address: "Basel, Switzerland",
    status: "not_started",
    photosCount: 0,
    reportsCount: 0,
    gradient: ["#33454A", "#1B2529"],
  },
  {
    id: "obj-loretto",
    name: "Loretto",
    address: "Freiburg, Lorettostraße 3",
    status: "not_started",
    photosCount: 0,
    reportsCount: 0,
    gradient: ["#453B52", "#241E2C"],
  },
  {
    id: "obj-angelverein",
    name: "Angelverein Riegel",
    address: "Riegel am Kaiserstuhl",
    status: "not_started",
    photosCount: 0,
    reportsCount: 0,
    gradient: ["#3A4740", "#1E2622"],
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
