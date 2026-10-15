/**
 * Когда и кому напоминать про отчёт. Чистая логика без базы и сети — вся под тестами.
 *
 * Время — бельгийское (Europe/Brussels), потому что бригада работает там. Планировщик в Supabase
 * стучится дважды в день (16:00 и 17:00 UTC), а 18:00 в Брюсселе — это 16:00 UTC летом и 17:00 UTC зимой:
 * `isReminderHour` пропускает ровно один из двух запусков, поэтому переход на летнее/зимнее время
 * ничего не ломает и ничего не нужно переключать руками.
 */
export const REMINDER_TIME_ZONE = "Europe/Brussels";
export const REMINDER_HOUR = 18;

export interface BrusselsClock {
  /** Календарная дата в Брюсселе, `YYYY-MM-DD` — так же хранится `site_reports.work_date`. */
  dateKey: string;
  hour: number;
}

const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: REMINDER_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
});

export function brusselsClock(now: Date): BrusselsClock {
  const parts = Object.fromEntries(formatter.formatToParts(now).map((part) => [part.type, part.value]));

  return { dateKey: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

export function isReminderHour(now: Date): boolean {
  return brusselsClock(now).hour === REMINDER_HOUR;
}

export interface Candidate {
  userId: string;
  isActive: boolean;
  /** Уже есть отчёт на сегодняшнюю дату. */
  reportedToday: boolean;
  /** Когда этому устройству уже слали напоминание (защита от повторного запуска планировщика). */
  lastSentOn: string | null;
}

/** Кому слать: тем, кто сам включил напоминание, активным, без отчёта за сегодня и без напоминания сегодня. */
export function pickRecipients(candidates: readonly Candidate[], todayKey: string): string[] {
  const ids = new Set<string>();

  for (const c of candidates) {
    if (!c.isActive || c.reportedToday || c.lastSentOn === todayKey) continue;
    ids.add(c.userId);
  }

  return [...ids];
}
