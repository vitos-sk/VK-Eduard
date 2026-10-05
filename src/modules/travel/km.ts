/**
 * Километры из поля ввода: «42», «42,5», «42.5». Пусто — `null` (не указано, это нормально);
 * мусор или число вне 0..9999 — `NaN` (форма покажет ошибку). Округляем до десятых, как в базе.
 */
export function parseKm(input: string): number | null {
  const text = input.trim().replace(",", ".");

  if (text === "") return null;

  const value = Number(text);

  if (!Number.isFinite(value) || value < 0 || value > 9999) return Number.NaN;

  return Math.round(value * 10) / 10;
}
