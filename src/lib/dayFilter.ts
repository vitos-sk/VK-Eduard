import { addDays, addMonths, isSameMonth } from "date-fns";

import { dateKeyOf } from "@/modules/time/calc";

/**
 * Выбранный в календаре день действует, только пока он лежит в показанном месяце: сменился месяц
 * другим путём (запомненный в сеансе, стрелка в другом режиме) — фильтр по дню молча отключается,
 * а не показывает пустоту за чужой месяц.
 */
export function activeDay(day: Date | null, month: Date): Date | null {
  return day && isSameMonth(day, month) ? day : null;
}

/**
 * Шаг стрелки навигатора. День выбран — листаем по дню (вчера/завтра), месяц идёт следом; дня нет —
 * листаем по месяцам. Стрелка всегда двигает то, что написано на кнопке с датой.
 */
export function stepPeriod(
  month: Date,
  day: Date | null,
  direction: -1 | 1,
): { month: Date; day: Date | null } {
  if (day) {
    const next = addDays(day, direction);

    return { month: next, day: next };
  }

  return { month: addMonths(month, direction), day: null };
}

/** Дня нет — подходит любая дата месяца; день есть — только он (`work_date` вида `YYYY-MM-DD`). */
export function matchesDay(workDate: string, day: Date | null): boolean {
  return day === null || workDate === dateKeyOf(day);
}
