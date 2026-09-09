import { elapsedSecondsNow, sumTotalMinutes } from "@/modules/time/calc";
import type { PeriodBar, PeriodSummary } from "@/lib/types";
import type { WorkEntry } from "./types";

/** Сводка одного дня — то, что показывают карточки на вкладке «День». */
export interface DayAggregate {
  /** Отработано, в минутах: закрытые записи + секунды текущей открытой. */
  workedMinutes: number;
  /** Перерыв, в минутах, суммарно по всем записям дня. */
  breakMinutes: number;
  /** Есть открытая (`ended_at = null`) запись среди `entries`. */
  hasOpenEntry: boolean;
  /** Самое раннее `started_at` дня или `null`, если записей нет. */
  earliestStart: string | null;
  /** Самое позднее `ended_at` дня; `null`, если записей нет или одна ещё идёт. */
  latestEnd: string | null;
}

/**
 * Сворачивает записи одного дня в одну сводку. Записей может быть
 * несколько (DATA-MODEL.md: «был на двух объектах — две записи») —
 * здесь они складываются, а не выбирается одна «главная».
 */
export function aggregateDay(
  entries: readonly WorkEntry[],
  now: Date,
): DayAggregate {
  let workedMinutes = 0;
  let breakMin = 0;
  let hasOpenEntry = false;
  let earliestStart: string | null = null;
  let latestEnd: string | null = null;

  for (const entry of entries) {
    breakMin += entry.break_minutes ?? 0;

    if (entry.ended_at === null) {
      hasOpenEntry = true;
      workedMinutes += Math.floor(
        elapsedSecondsNow(
          entry.work_date,
          entry.started_at,
          entry.break_start,
          entry.break_end,
          now,
        ) / 60,
      );
    } else {
      workedMinutes += entry.total_minutes ?? 0;

      if (latestEnd === null || entry.ended_at > latestEnd) {
        latestEnd = entry.ended_at;
      }
    }

    if (earliestStart === null || entry.started_at < earliestStart) {
      earliestStart = entry.started_at;
    }
  }

  return {
    workedMinutes,
    breakMinutes: breakMin,
    hasOpenEntry,
    earliestStart,
    latestEnd: hasOpenEntry ? null : latestEnd,
  };
}

/** Один день будущей столбчатой диаграммы — до того как в нём появились часы. */
export interface DaySlot {
  /** `YYYY-MM-DD`. */
  date: string;
  /** Короткая подпись под столбцом: «Пн», «01». */
  label: string;
  isOffDay: boolean;
}

/**
 * Строит `PeriodSummary` для «Тиждень» / «Місяць» из плоского списка записей
 * за диапазон дат. `slots` задаёт сами дни диапазона (и их подписи) —
 * функция только раскладывает записи по дням и считает суммы.
 */
export function buildPeriodSummary(
  title: string,
  planMinutes: number,
  slots: readonly DaySlot[],
  entries: readonly WorkEntry[],
): PeriodSummary {
  const byDate = new Map<string, WorkEntry[]>();

  for (const entry of entries) {
    const bucket = byDate.get(entry.work_date);

    if (bucket) {
      bucket.push(entry);
    } else {
      byDate.set(entry.work_date, [entry]);
    }
  }

  // Открытая смена ещё не даёт `total_minutes` — в столбец «сегодня» она
  // добавится, когда рабочий нажмёт «Завершити роботу». Тиждень/Місяць
  // не тикают вживу, в отличие от «Дня»: это сводки, а не таймер.
  const bars: PeriodBar[] = slots.map((slot) => ({
    date: slot.date,
    label: slot.label,
    workedMin: sumTotalMinutes(byDate.get(slot.date) ?? []),
    isOffDay: slot.isOffDay,
  }));

  const totalMin = bars.reduce((sum, bar) => sum + bar.workedMin, 0);
  const daysWorked = bars.filter((bar) => bar.workedMin > 0).length;

  return {
    title,
    totalMin,
    planMin: planMinutes,
    daysWorked,
    averageMin: daysWorked === 0 ? 0 : Math.round(totalMin / daysWorked),
    bars,
  };
}
