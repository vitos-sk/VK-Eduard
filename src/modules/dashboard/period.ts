import {
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  startOfMonth,
  startOfQuarter,
  startOfYear,
} from "date-fns";

import { t } from "@/lib/i18n";
import { dateKeyOf } from "@/modules/time/calc";

export type DashboardPeriod = "month" | "quarter" | "year";

/** Межі обраного періоду навколо `reference` — «зараз» на клієнті. */
export function getPeriodRange(
  period: DashboardPeriod,
  reference: Date,
): { from: Date; to: Date } {
  switch (period) {
    case "quarter":
      return { from: startOfQuarter(reference), to: endOfQuarter(reference) };
    case "year":
      return { from: startOfYear(reference), to: endOfYear(reference) };
    default:
      return { from: startOfMonth(reference), to: endOfMonth(reference) };
  }
}

export interface HoursChartPoint {
  label: string;
  minutes: number;
}

/** Запись достаточно этих двух полей — компонент графика не знает про остальные. */
export interface HoursEntryLike {
  work_date: string;
  total_minutes: number | null;
}

function sumInRange(
  minutesByDate: ReadonlyMap<string, number>,
  from: Date,
  to: Date,
): number {
  let sum = 0;
  const fromKey = dateKeyOf(from);
  const toKey = dateKeyOf(to);

  for (const [date, minutes] of minutesByDate) {
    if (date >= fromKey && date <= toKey) {
      sum += minutes;
    }
  }

  return sum;
}

/**
 * Кошики графіка «Динаміка годин» — гранулярність залежить від періоду:
 * місяць — по днях, квартал — по тижнях (інакше 90 стовпчиків), рік — по
 * місяцях. Пусті кошики (без записів) залишаються з `minutes: 0`, а не
 * пропадають — інакше графік «стрибає» по осі X.
 */
export function buildHoursChartData(
  period: DashboardPeriod,
  reference: Date,
  entries: readonly HoursEntryLike[],
): HoursChartPoint[] {
  const { from, to } = getPeriodRange(period, reference);

  const minutesByDate = new Map<string, number>();
  for (const entry of entries) {
    minutesByDate.set(
      entry.work_date,
      (minutesByDate.get(entry.work_date) ?? 0) + (entry.total_minutes ?? 0),
    );
  }

  if (period === "year") {
    return eachMonthOfInterval({ start: from, end: to }).map((monthStart) => ({
      label: t.months.nominative[monthStart.getMonth()].slice(0, 3),
      minutes: sumInRange(minutesByDate, monthStart, endOfMonth(monthStart)),
    }));
  }

  if (period === "quarter") {
    return eachWeekOfInterval({ start: from, end: to }, { weekStartsOn: 1 }).map(
      (weekStart) => ({
        label: `${String(weekStart.getDate()).padStart(2, "0")}.${String(
          weekStart.getMonth() + 1,
        ).padStart(2, "0")}`,
        minutes: sumInRange(minutesByDate, weekStart, endOfWeek(weekStart, { weekStartsOn: 1 })),
      }),
    );
  }

  return eachDayOfInterval({ start: from, end: to }).map((day) => ({
    label: String(day.getDate()).padStart(2, "0"),
    minutes: minutesByDate.get(dateKeyOf(day)) ?? 0,
  }));
}
