/** Сколько смен и минут набралось у одного значения фильтра (сотрудник, объект) или у «Усі». */
export interface FilterStat {
  shifts: number;
  minutes: number;
}

export const EMPTY_FILTER_STAT: FilterStat = { shifts: 0, minutes: 0 };

export interface FilterStats {
  /** Все переданные смены — подпись у пункта «Усі». */
  total: FilterStat;
  /** По ключу (id сотрудника / объекта). Смены без ключа попадают только в `total`. */
  byKey: ReadonlyMap<string, FilterStat>;
}

/**
 * Считает смены и часы для выпадающих списков фильтров на экране «Години».
 * Смена, которая ещё идёт (`total_minutes = null`), считается как смена с 0 минут —
 * так же, как в заголовке «Разом: … · N змін».
 */
export function tallyEntries<T extends { total_minutes: number | null }>(
  entries: readonly T[],
  keyOf: (entry: T) => string | null,
): FilterStats {
  const byKey = new Map<string, FilterStat>();
  let shifts = 0;
  let minutes = 0;

  for (const entry of entries) {
    const entryMinutes = entry.total_minutes ?? 0;
    shifts += 1;
    minutes += entryMinutes;

    const key = keyOf(entry);
    if (key === null) continue;

    const current = byKey.get(key) ?? EMPTY_FILTER_STAT;
    byKey.set(key, { shifts: current.shifts + 1, minutes: current.minutes + entryMinutes });
  }

  return { total: { shifts, minutes }, byKey };
}
