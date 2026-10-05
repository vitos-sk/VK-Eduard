import { uk } from "./uk";

/** Форма словаря. `en.ts` и `nl.ts` обязаны ей соответствовать. */
export type Dict = typeof uk;

export { uk };
export * from "./locales";
