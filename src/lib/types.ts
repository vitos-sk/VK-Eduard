import type { SiteScene } from "@/lib/siteScene";

/**
 * Общие типы приложения. Всё здесь строится из реальных данных — моков
 * в `src/lib/mock/` для этого больше не осталось (остался только `quick.ts`,
 * список пунктов листа быстрых действий — это конфигурация UI, не данные).
 * Отчёты («Звіти») — `site_reports`, см. `modules/reports/types.ts`.
 */

/** Статус объекта или рабочего дня. Справочник — раздел 3.4 плана. */
export type WorkStatus = "in_progress" | "not_started" | "completed" | "paused";

/**
 * Форма стройплощадки для карточки/миниатюры. Строится из строки `sites`
 * через `modules/sites/present.ts` — `photosCount`/`reportsCount` в базе
 * не хранятся, это агрегат по звітам (`site_reports`) (`modules/reports/siteStats.ts`).
 */
export interface SiteObject {
  id: string;
  name: string;
  address: string;
  /** Вид работ (`sites.kind`) — подпись под названием в списках. */
  kind: string;
  status: WorkStatus;
  photosCount: number;
  reportsCount: number;
  /** SVG-сцена для `Thumb` — используется, пока нет `photoUrl`. */
  scene: SiteScene;
  /** Подписанная ссылка на `sites.photo_path`, если фото объекта загружено. */
  photoUrl: string | null;
  /** `sites.archived_at` — не `null`, если объект архивирован. */
  archivedAt: string | null;
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
  | "create_report"
  | "dashboard";

/** Пункт листа быстрых действий. */
export interface QuickAction {
  id: QuickActionId;
  title: string;
  description: string;
  /** Куда ведёт пункт. `null` — действие без своего экрана (тост). */
  href: string | null;
}
