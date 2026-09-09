/**
 * Окно правки: 7 дней рабочему, без ограничения шефу. Зеркалит политику
 * `entries_update` в базе (DATA-MODEL.md) — используется на клиенте только
 * чтобы не показывать элементы правки, которые RLS всё равно отклонит,
 * а не как источник истины: истина в базе.
 */
export const EDIT_WINDOW_DAYS = 7;

export function isWithinEditWindow(
  workDate: string,
  isBoss: boolean,
  todayKey: string,
): boolean {
  if (isBoss) return true;

  const workDateMs = new Date(`${workDate}T00:00:00`).getTime();
  const todayMs = new Date(`${todayKey}T00:00:00`).getTime();
  const diffDays = Math.round((todayMs - workDateMs) / 86_400_000);

  return diffDays <= EDIT_WINDOW_DAYS;
}
