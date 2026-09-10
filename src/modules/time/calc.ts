/**
 * Арифметика рабочего времени. Зеркалит generated-колонки Postgres из
 * `supabase/migrations/0001_init.sql` (`break_minutes`, `total_minutes`,
 * ограничение `duration_sane`) — числа здесь и в базе обязаны совпадать,
 * иначе клиент покажет одну длительность, а сохранится другая.
 *
 * Модуль не знает ни про базу, ни про UI: только числа и `HH:mm`-строки.
 * Поэтому не переиспользует `lib/format` — тот тянет `date-fns` и словарь
 * локализации, а домену это не нужно и мешало бы изолированным тестам.
 */

/** Совпадает с ограничением `duration_sane`: от минуты до 18 часов. */
export const MIN_SHIFT_MINUTES = 1;
export const MAX_SHIFT_MINUTES = 1080;

/** `08:30` → 510 минут от полуночи. */
export function timeToMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

/** Минуты от полуночи → `HH:mm`, значение приводится в диапазон 0..1439. */
export function minutesToTime(totalMinutes: number): string {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(wrapped / 60);
  const minutes = wrapped % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Минут между `from` и `to` с переходом через полночь: если `to` раньше
 * `from`, считаем, что смена перешла на следующий день, а не что во время
 * вкралась ошибка. Аналог `(... + 86400) % 86400` из generated-колонок —
 * там секунды, здесь минуты, но входные `HH:mm` секунд не содержат,
 * поэтому результат идентичен.
 */
export function minutesBetweenWrapped(from: string, to: string): number {
  return ((timeToMinutes(to) - timeToMinutes(from) + 1440) % 1440 + 1440) % 1440;
}

/** Перерыв в минутах. Не указан хотя бы один край — перерыва не было. */
export function breakMinutes(
  breakStart: string | null,
  breakEnd: string | null,
): number {
  if (breakStart === null || breakEnd === null) {
    return 0;
  }

  return minutesBetweenWrapped(breakStart, breakEnd);
}

/**
 * Итог смены в минутах. `null`, пока смена не завершена — как и
 * `total_minutes` в базе при `ended_at is null`.
 */
export function totalMinutes(
  startedAt: string,
  endedAt: string | null,
  breakStart: string | null,
  breakEnd: string | null,
): number | null {
  if (endedAt === null) {
    return null;
  }

  return (
    minutesBetweenWrapped(startedAt, endedAt) - breakMinutes(breakStart, breakEnd)
  );
}

/**
 * Перерыв не может закончиться, не начавшись: `breakEnd` без `breakStart`
 * недопустим. А вот `breakStart` без `breakEnd` — законное состояние
 * «перерва триває», а не ошибка (смена ещё открыта, конца перерыва пока нет).
 * Совпадает с ограничением `break_pair` в базе.
 */
export function isBreakPairValid(
  breakStart: string | null,
  breakEnd: string | null,
): boolean {
  return breakStart !== null || breakEnd === null;
}

/** Совпадает с ограничением `duration_sane`. */
export function isDurationValid(minutes: number): boolean {
  return minutes >= MIN_SHIFT_MINUTES && minutes <= MAX_SHIFT_MINUTES;
}

/**
 * «Відпрацьовано» — не больше дневной нормы, «Додатково» — всё, что сверху.
 * Норма не хранится в записи: она может измениться у сотрудника, поэтому
 * считается на лету из текущего профиля — как и во вьюхе `entry_hours`.
 */
export function splitWorkedOvertime(
  minutes: number,
  normMinutes: number,
): { workedMinutes: number; overtimeMinutes: number } {
  return {
    workedMinutes: Math.min(minutes, normMinutes),
    overtimeMinutes: Math.max(0, minutes - normMinutes),
  };
}

/**
 * `YYYY-MM-DD` + время → `Date`. Время принимает как `HH:mm` (то, что
 * пишет на клиенте `hhmmOf`), так и `HH:mm:ss` (то, что реально отдаёт
 * Supabase для колонок типа `time` в Postgres) — оба варианта встречаются
 * в `openEntry`, пришедшем с сервера.
 */
function toDateTime(workDate: string, time: string): Date {
  const [hh = "00", mm = "00", ss = "00"] = time.split(":");
  return new Date(`${workDate}T${hh.padStart(2, "0")}:${mm.padStart(2, "0")}:${ss.padStart(2, "0")}`);
}

/**
 * Сколько секунд идёт смена прямо сейчас — источник для тикающего таймера.
 * Во время перерыва (`breakStart` задан, `breakEnd` — нет) секунды не растут:
 * таймер стоит, а не бежит поверх «Пауза».
 *
 * `workDate` — `YYYY-MM-DD`, `startedAt`/`breakStart`/`breakEnd` — `HH:mm`
 * или `HH:mm:ss`.
 */
export function elapsedSecondsNow(
  workDate: string,
  startedAt: string,
  breakStart: string | null,
  breakEnd: string | null,
  now: Date,
): number {
  const start = toDateTime(workDate, startedAt);
  const elapsedMs = now.getTime() - start.getTime();

  if (breakStart !== null) {
    const breakStartDate = toDateTime(workDate, breakStart);

    if (breakEnd !== null) {
      const breakEndDate = toDateTime(workDate, breakEnd);
      const breakMs = Math.max(0, breakEndDate.getTime() - breakStartDate.getTime());

      return Math.max(0, Math.floor((elapsedMs - breakMs) / 1000));
    }

    // Перерыв идёт прямо сейчас: время после его начала не считаем.
    const msUntilBreak = breakStartDate.getTime() - start.getTime();

    return Math.max(0, Math.floor(msUntilBreak / 1000));
  }

  return Math.max(0, Math.floor(elapsedMs / 1000));
}

/**
 * `Date` → `HH:mm` в часовом поясе устройства, на котором вызван код.
 * Нужен на клиенте: сервер (Vercel) исполняется в UTC и не знает часовой
 * пояс рабочего, поэтому «сейчас» для старта/стопа смены считает браузер,
 * а не сервер — иначе смена запишется со сдвигом на пояс дата-центра.
 */
export function hhmmOf(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

/** `Date` → `YYYY-MM-DD` в часовом поясе устройства — по той же причине. */
export function dateKeyOf(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/** Сумма отработанных минут по завершённым записям; открытые не учитываем. */
export function sumTotalMinutes(
  entries: readonly { total_minutes: number | null }[],
): number {
  return entries.reduce((sum, entry) => sum + (entry.total_minutes ?? 0), 0);
}
