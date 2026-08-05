import { uk } from "./uk";

/**
 * Активный словарь. Никакой библиотеки — просто типизированный объект.
 * Импортируется как `import { t } from "@/lib/i18n"`.
 */
export const t = uk;

/** Форма словаря. Будущие локали должны ей соответствовать. */
export type Dict = typeof uk;

/** Код активной локали — пригодится для `date-fns` и атрибута `lang`. */
export const locale = "uk" as const;

export { uk };
