/**
 * Зеркало части токенов из `tokens.css` для мест, где CSS-переменные недоступны:
 * PDF-экспорт, манифест PWA, `theme-color`, генератор иконок.
 * Соответствие проверяет `tokens.test.ts` — значения нельзя менять только здесь.
 */
export const tokens = {
  paper: "#f3ecdc",
  ticket: "#fffdf7",
  stub: "#efe5cc",
  edge: "#e4d8ba",
  perf: "#cdbf9b",
  ink: "#1c2716",
  ink2: "#5e6049",
  ink3: "#6b664c",
  green: "#1f5a17",
  yellow: "#f5c43c",
  warn: "#8a5a00",
  err: "#b3261e",
} as const;
