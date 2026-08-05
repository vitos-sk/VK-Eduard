import { formatDayMonth } from "@/lib/format";
import { t } from "@/lib/i18n";
import type {
  DaySheet,
  PeriodBar,
  PeriodSummary,
  TimeEntry,
} from "@/lib/types";
import { TODAY } from "@/lib/mock/user";

/** Отработано сегодня: 05:42:18. */
export const TODAY_WORKED_SEC = 5 * 3600 + 42 * 60 + 18;

/** Перерыв сегодня: 00:18:00. */
export const TODAY_BREAK_SEC = 18 * 60;

/** Рабочий день — вкладка «День» на экране «Години» и карточка на главной. */
export const daySheet: DaySheet = {
  date: "2025-07-30",
  status: "in_progress",
  startAt: "08:00",
  endAt: null,
  workedSec: TODAY_WORKED_SEC,
  breakSec: TODAY_BREAK_SEC,
  outsideSec: 0,
  updatedAt: "09:41",
  timeline: [
    { time: "08:00", label: t.hours.start, kind: "start" },
    { time: "12:30", label: t.hours.break, kind: "break" },
    { time: "14:00", label: t.hours.now, kind: "now" },
  ],
};

/** Записи времени за сегодня — из них складывается таймлайн. */
export const todayEntries: readonly TimeEntry[] = [
  {
    id: "te-1",
    kind: "on_site",
    date: "2025-07-30",
    startAt: "08:00",
    endAt: "12:30",
    durationMin: 270,
    objectId: "obj-reimond",
    description: "Монтаж фасадних панелей",
  },
  {
    id: "te-2",
    kind: "on_site",
    date: "2025-07-30",
    startAt: "12:48",
    endAt: null,
    durationMin: 72,
    objectId: "obj-villa",
    description: null,
  },
];

/** Границы шкалы на графике рабочего дня: 06:00 — 18:00. */
export const dayChartTicks = [
  "06:00",
  "09:00",
  "12:00",
  "15:00",
  "18:00",
] as const;

/**
 * Собирает сводку из столбцов: суммы и среднее не хардкодим,
 * чтобы цифры не разъезжались при правке моков.
 */
function summarize(
  title: string,
  planMin: number,
  bars: readonly PeriodBar[],
): PeriodSummary {
  const totalMin = bars.reduce((sum, bar) => sum + bar.workedMin, 0);
  const daysWorked = bars.filter((bar) => bar.workedMin > 0).length;

  return {
    title,
    totalMin,
    planMin,
    daysWorked,
    averageMin: daysWorked === 0 ? 0 : Math.round(totalMin / daysWorked),
    bars,
  };
}

/** Текущая неделя: понеділок 28 липня — неділя 3 серпня. */
const weekBars: readonly PeriodBar[] = [
  { date: "2025-07-28", label: t.weekdays.short[1], workedMin: 495, isOffDay: false },
  { date: "2025-07-29", label: t.weekdays.short[2], workedMin: 560, isOffDay: false },
  { date: "2025-07-30", label: t.weekdays.short[3], workedMin: 342, isOffDay: false },
  { date: "2025-07-31", label: t.weekdays.short[4], workedMin: 0, isOffDay: false },
  { date: "2025-08-01", label: t.weekdays.short[5], workedMin: 0, isOffDay: false },
  { date: "2025-08-02", label: t.weekdays.short[6], workedMin: 0, isOffDay: true },
  { date: "2025-08-03", label: t.weekdays.short[0], workedMin: 0, isOffDay: true },
];

export const weekSummary: PeriodSummary = summarize(
  `${formatDayMonth(new Date(2025, 6, 28))} — ${formatDayMonth(new Date(2025, 7, 3))}`,
  5 * 480,
  weekBars,
);

/**
 * Липень 2025, 31 день. Минуты по дням; 0 — выходной или день,
 * который ещё не наступил (31 липня).
 */
const julyMinutes: readonly number[] = [
  480, 495, 510, 465, 0, 0, // 01–06
  480, 525, 450, 500, 435, 180, 0, // 07–13
  490, 470, 505, 480, 455, 0, 0, // 14–20
  500, 480, 465, 520, 440, 0, 615, // 21–27
  495, 560, 342, 0, // 28–31
];

const monthBars: readonly PeriodBar[] = julyMinutes.map((workedMin, index) => {
  const day = index + 1;
  const date = new Date(2025, 6, day);
  const weekday = date.getDay();

  return {
    date: `2025-07-${String(day).padStart(2, "0")}`,
    label: String(day).padStart(2, "0"),
    workedMin,
    // Выходной — только если в этот день реально не работали.
    isOffDay: workedMin === 0 && (weekday === 0 || weekday === 6),
  };
});

export const monthSummary: PeriodSummary = summarize(
  `${t.months.nominative[TODAY.getMonth()]} ${TODAY.getFullYear()}`,
  23 * 480,
  monthBars,
);
