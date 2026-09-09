/**
 * Общие типы приложения. Всё здесь строится из реальных данных — моков
 * в `src/lib/mock/` для этого больше не осталось (остался только `quick.ts`,
 * список пунктов листа быстрых действий — это конфигурация UI, не данные).
 * Отчёты («Звіти») не отдельный тип — это те же `work_entries`,
 * см. `modules/entries/types.ts`.
 */

/** Статус объекта или рабочего дня. Справочник — раздел 3.4 плана. */
export type WorkStatus = "in_progress" | "not_started" | "completed" | "paused";

/**
 * Форма стройплощадки для карточки/миниатюры. Строится из строки `sites`
 * через `modules/sites/present.ts` — `photosCount`/`reportsCount` в базе
 * не хранятся, это агрегат по своим же записям (`modules/entries/siteStats.ts`).
 */
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
