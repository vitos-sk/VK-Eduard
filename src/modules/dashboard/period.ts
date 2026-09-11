import { t } from "@/lib/i18n";
import { dateKeyOf } from "@/modules/time/calc";

export type DashboardPeriod = "month" | "quarter" | "year";

/** Межі обраного періоду навколо `reference` — «зараз» на клієнті. */
export function getPeriodRange(
  period: DashboardPeriod,
  reference: Date,
): { from: Date; to: Date } {
  // Get date components from reference
  const year = reference.getUTCFullYear();
  const month = reference.getUTCMonth();
  const date = reference.getUTCDate();
  const quarter = Math.floor(month / 3);

  switch (period) {
    case "quarter": {
      const quarterStartMonth = quarter * 3;
      return {
        from: new Date(Date.UTC(year, quarterStartMonth, 1)),
        to: new Date(Date.UTC(year, quarterStartMonth + 3, 0)),
      };
    }
    case "year":
      return {
        from: new Date(Date.UTC(year, 0, 1)),
        to: new Date(Date.UTC(year, 11, 31)),
      };
    default:
      return {
        from: new Date(Date.UTC(year, month, 1)),
        to: new Date(Date.UTC(year, month + 1, 0)),
      };
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
    const months: HoursChartPoint[] = [];
    const startYear = from.getUTCFullYear();
    const startMonth = from.getUTCMonth();
    const endMonth = to.getUTCMonth();

    for (let m = startMonth; m <= endMonth; m++) {
      const monthStart = new Date(Date.UTC(startYear, m, 1));
      const monthEnd = new Date(Date.UTC(startYear, m + 1, 0));
      months.push({
        label: t.months.nominative[m].slice(0, 3),
        minutes: sumInRange(minutesByDate, monthStart, monthEnd),
      });
    }
    return months;
  }

  if (period === "quarter") {
    const weeks: HoursChartPoint[] = [];
    let current = new Date(from);
    while (current <= to) {
      const weekStart = new Date(current);
      // Move to next Monday if not already
      const dayOfWeek = weekStart.getUTCDay();
      if (dayOfWeek !== 1) {
        weekStart.setUTCDate(weekStart.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      }
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

      weeks.push({
        label: `${String(weekStart.getUTCDate()).padStart(2, "0")}.${String(
          weekStart.getUTCMonth() + 1,
        ).padStart(2, "0")}`,
        minutes: sumInRange(minutesByDate, weekStart, weekEnd),
      });

      current.setUTCDate(current.getUTCDate() + 7);
    }
    return weeks;
  }

  const days: HoursChartPoint[] = [];
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(Date.UTC(year, month, d));
    days.push({
      label: String(d).padStart(2, "0"),
      minutes: minutesByDate.get(dateKeyOf(day)) ?? 0,
    });
  }
  return days;
}
