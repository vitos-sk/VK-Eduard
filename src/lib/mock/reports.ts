import { formatDayMonth, fromDateKey } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { Report, ReportGroup } from "@/lib/types";

/**
 * 12 отчётов за три дня. Группы уже собраны — экран «Звіти» их просто рендерит,
 * группировкой на лету не занимается.
 */
export const reports: readonly Report[] = [
  // --- Сьогодні, 30 липня ---
  {
    id: "rep-01",
    objectId: "obj-reimond",
    objectName: "Reimond",
    date: "2025-07-30",
    timeFrom: "08:00",
    timeTo: "10:30",
    workKinds: ["montazh"],
    status: "completed",
    photosCount: 4,
    commentsCount: 2,
  },
  {
    id: "rep-02",
    objectId: "obj-villa",
    objectName: "Villa Project",
    date: "2025-07-30",
    timeFrom: "10:45",
    timeTo: "12:30",
    workKinds: ["uteplennia", "montazh"],
    status: "completed",
    photosCount: 6,
    commentsCount: 1,
  },
  {
    id: "rep-03",
    objectId: "obj-reimond",
    objectName: "Reimond",
    date: "2025-07-30",
    timeFrom: "12:48",
    timeTo: "14:15",
    workKinds: ["demontazh"],
    status: "in_progress",
    photosCount: 2,
    commentsCount: 0,
  },
  {
    id: "rep-04",
    objectId: "obj-loretto",
    objectName: "Loretto",
    date: "2025-07-30",
    timeFrom: "14:20",
    timeTo: "15:40",
    workKinds: ["montazh"],
    status: "in_progress",
    photosCount: 3,
    commentsCount: 4,
  },
  {
    id: "rep-05",
    objectId: "obj-villa",
    objectName: "Villa Project",
    date: "2025-07-30",
    timeFrom: "15:45",
    timeTo: "17:00",
    workKinds: ["uteplennia"],
    status: "in_progress",
    photosCount: 1,
    commentsCount: 0,
  },

  // --- Вчора, 29 липня ---
  {
    id: "rep-06",
    objectId: "obj-reimond",
    objectName: "Reimond",
    date: "2025-07-29",
    timeFrom: "08:15",
    timeTo: "11:00",
    workKinds: ["montazh", "demontazh"],
    status: "completed",
    photosCount: 5,
    commentsCount: 3,
  },
  {
    id: "rep-07",
    objectId: "obj-hanser",
    objectName: "Hanser House",
    date: "2025-07-29",
    timeFrom: "11:30",
    timeTo: "13:45",
    workKinds: ["uteplennia"],
    status: "completed",
    photosCount: 2,
    commentsCount: 1,
  },
  {
    id: "rep-08",
    objectId: "obj-villa",
    objectName: "Villa Project",
    date: "2025-07-29",
    timeFrom: "14:00",
    timeTo: "17:30",
    workKinds: ["montazh"],
    status: "completed",
    photosCount: 7,
    commentsCount: 2,
  },

  // --- 27 липня ---
  {
    id: "rep-09",
    objectId: "obj-loretto",
    objectName: "Loretto",
    date: "2025-07-27",
    timeFrom: "07:45",
    timeTo: "10:15",
    workKinds: ["demontazh"],
    status: "completed",
    photosCount: 3,
    commentsCount: 0,
  },
  {
    id: "rep-10",
    objectId: "obj-reimond",
    objectName: "Reimond",
    date: "2025-07-27",
    timeFrom: "10:30",
    timeTo: "12:00",
    workKinds: ["montazh", "uteplennia"],
    status: "completed",
    photosCount: 4,
    commentsCount: 5,
  },
  {
    id: "rep-11",
    objectId: "obj-angelverein",
    objectName: "Angelverein Riegel",
    date: "2025-07-27",
    timeFrom: "12:30",
    timeTo: "15:00",
    workKinds: ["uteplennia"],
    status: "completed",
    photosCount: 2,
    commentsCount: 1,
  },
  {
    id: "rep-12",
    objectId: "obj-villa",
    objectName: "Villa Project",
    date: "2025-07-27",
    timeFrom: "15:15",
    timeTo: "18:00",
    workKinds: ["montazh"],
    status: "completed",
    photosCount: 6,
    commentsCount: 2,
  },
] as const;

/** Отчёты за одну дату, в порядке из массива выше. */
function byDate(date: string): readonly Report[] {
  return reports.filter((report) => report.date === date);
}

/**
 * Готовые группы для экрана «Звіти».
 * Заголовки «Сьогодні» и «Вчора» — из словаря, остальные считаются от даты.
 */
export const reportGroups: readonly ReportGroup[] = [
  {
    date: "2025-07-30",
    title: t.reports.today,
    reports: byDate("2025-07-30"),
  },
  {
    date: "2025-07-29",
    title: t.reports.yesterday,
    reports: byDate("2025-07-29"),
  },
  {
    date: "2025-07-27",
    title: formatDayMonth(fromDateKey("2025-07-27")),
    reports: byDate("2025-07-27"),
  },
];
