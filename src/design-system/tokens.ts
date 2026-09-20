/**
 * Зеркало части токенов из `tokens.css` для мест, где CSS-переменные недоступны:
 * PDF-экспорт, манифест PWA, `theme-color`, генератор иконок.
 * Соответствие проверяет `tokens.test.ts` — значения нельзя менять только здесь.
 */
export const tokens = {
  bg: "#f6f3ea",
  text: "#14210f",
  textMuted: "#55624d",
  border: "#ddd7c3",
  accent: "#f5c43c",
  brandDeep: "#0d2b08",
} as const;

/** Пары «от → до» для миниатюр объектов — имена CSS-переменных из `tokens.css`. */
export const SITE_GRADIENT_VARS: readonly (readonly [string, string])[] = [
  ["var(--site-1-from)", "var(--site-1-to)"],
  ["var(--site-2-from)", "var(--site-2-to)"],
  ["var(--site-3-from)", "var(--site-3-to)"],
  ["var(--site-4-from)", "var(--site-4-to)"],
  ["var(--site-5-from)", "var(--site-5-to)"],
];
