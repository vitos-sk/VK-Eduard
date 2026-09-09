/**
 * Общие типы приложения. Часть всё ещё описывает форму моков из
 * `src/lib/mock/` (объекты, отчёты — этапы 4 и 6); `PeriodBar`/`PeriodSummary`
 * уже реальные — их строит `modules/entries/period.ts` из базы.
 */

/** Статус объекта, отчёта или рабочего дня. Справочник — раздел 3.4 плана. */
export type WorkStatus = "in_progress" | "not_started" | "completed" | "paused";

/** Вид выполненных работ в отчёте. */
export type WorkKind = "montazh" | "uteplennia" | "demontazh";

/** Стройплощадка. */
export interface SiteObject {
  id: string;
  name: string;
  address: string;
  status: WorkStatus;
  photosCount: number;
  reportsCount: number;
  /** Пара цветов для градиента в `Thumb`. */
  gradient: readonly [string, string];
}

/** Отчёт о проделанной работе. */
export interface Report {
  id: string;
  objectId: string;
  objectName: string;
  /** Дата в формате `YYYY-MM-DD` — ключ группировки. */
  date: string;
  /** Начало интервала, `HH:mm`. */
  timeFrom: string;
  /** Конец интервала, `HH:mm`. */
  timeTo: string;
  workKinds: readonly WorkKind[];
  status: WorkStatus;
  photosCount: number;
  commentsCount: number;
}

/**
 * Готовая группа отчётов за одну дату — экран «Звіти» её просто рендерит.
 * `title` уже подставлен: «Сьогодні» / «Вчора» / «27 липня».
 */
export interface ReportGroup {
  /** Дата в формате `YYYY-MM-DD`. */
  date: string;
  title: string;
  reports: readonly Report[];
}

/** Один день в столбчатой диаграмме за неделю или месяц. */
export interface PeriodBar {
  /** Дата в формате `YYYY-MM-DD`. */
  date: string;
  /** Короткая подпись под столбцом: «Пн», «01». */
  label: string;
  /** Отработано, в минутах. */
  workedMin: number;
  /** Выходной — столбец рисуем приглушённым. */
  isOffDay: boolean;
}

/** Сводка за неделю или месяц. */
export interface PeriodSummary {
  /** Заголовок периода в навигаторе, например «21 — 27 липня». */
  title: string;
  /** Всего отработано, в минутах. */
  totalMin: number;
  /** Норма за период, в минутах. */
  planMin: number;
  /** Отработанных дней. */
  daysWorked: number;
  /** Среднее за рабочий день, в минутах. */
  averageMin: number;
  bars: readonly PeriodBar[];
}

/** Идентификатор пункта листа быстрых действий (кнопка «+»). */
export type QuickActionId =
  | "manual_time"
  | "start_work"
  | "start_break"
  | "create_report";

/** Пункт листа быстрых действий. */
export interface QuickAction {
  id: QuickActionId;
  title: string;
  description: string;
  /** CSS-цвет иконки: токен темы или HEX из таблицы шага 10. */
  accent: string;
  /** Куда ведёт пункт. `null` — действие без своего экрана (тост). */
  href: string | null;
}
