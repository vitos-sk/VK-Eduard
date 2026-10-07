import { minutesBetweenWrapped, timeToMinutes } from "./calc";

/**
 * Защита от дублей времени: один человек не может отработать две смены
 * одновременно, поэтому две его смены с пересекающимися интервалами — это
 * либо дубль (то же время внесли дважды: через отчёт и через «Додати час»,
 * повторное нажатие, повтор из офлайн-очереди), либо опечатка.
 *
 * Модуль чистый — ни базы, ни UI: только даты и `HH:mm`-строки.
 */

export interface ShiftSpan {
  /** `YYYY-MM-DD`. */
  workDate: string;
  /** `HH:mm` или `HH:mm:ss` (так отдаёт колонку `time` Supabase). */
  startedAt: string;
  /** `null` — смена не закрыта. */
  endedAt: string | null;
}

const MINUTES_PER_DAY = 1440;

/** Интервал смены в минутах от начала эпохи; `null`, если смена не закрыта. */
function toSpan(shift: ShiftSpan): { start: number; end: number } | null {
  if (shift.endedAt === null) return null;

  const [year = 1970, month = 1, day = 1] = shift.workDate.split("-").map(Number);
  const dayIndex = Math.round(Date.UTC(year, month - 1, day) / 86_400_000);
  const start = dayIndex * MINUTES_PER_DAY + timeToMinutes(shift.startedAt);

  // Конец раньше начала — ночная смена, она заканчивается на следующий день.
  return { start, end: start + minutesBetweenWrapped(shift.startedAt, shift.endedAt) };
}

/** Пересекаются ли две смены. Встык (конец одной = начало другой) — не пересечение. */
export function shiftsOverlap(a: ShiftSpan, b: ShiftSpan): boolean {
  const spanA = toSpan(a);
  const spanB = toSpan(b);

  if (!spanA || !spanB) return false;

  return spanA.start < spanB.end && spanB.start < spanA.end;
}

/**
 * Первая из `existing`, с которой пересекается `candidate`. `ignoreId` — id
 * записи, которую как раз правят: сама с собой она не конфликтует.
 */
export function findOverlap<T extends ShiftSpan & { id?: string }>(
  candidate: ShiftSpan,
  existing: readonly T[],
  ignoreId?: string,
): T | null {
  return existing.find((shift) => shift.id !== ignoreId && shiftsOverlap(candidate, shift)) ?? null;
}
