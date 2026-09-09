import { t } from "@/lib/i18n";
import type { QuickAction } from "@/lib/types";

/**
 * Четыре пункта листа быстрых действий (кнопка «+»).
 * `accent` — цвет иконки: токен темы или HEX из таблицы шага.
 * `href: null` означает действие без своего экрана — обрабатывается на месте
 * (старт/стоп смены и перерыва пишут прямо в базу, см. `QuickActionSheet`).
 *
 * Отдельного пункта «Дорога / Поза об'єктом» больше нет: в форме ручного
 * ввода объект и так необязателен (`site_id = null`) — второй пункт,
 * ведущий туда же с другой подписью, только путал бы.
 */
export const quickActions: readonly QuickAction[] = [
  {
    id: "manual_time",
    title: t.quick.manualTime.title,
    description: t.quick.manualTime.description,
    accent: "var(--brand)",
    href: "/time/manual",
  },
  {
    id: "start_work",
    title: t.quick.startWork.title,
    description: t.quick.startWork.description,
    accent: "var(--success)",
    href: null,
  },
  {
    id: "start_break",
    title: t.quick.startBreak.title,
    description: t.quick.startBreak.description,
    accent: "var(--warning)",
    href: null,
  },
  {
    id: "create_report",
    title: t.quick.createReport.title,
    description: t.quick.createReport.description,
    accent: "var(--text-muted)",
    href: "/reports/new",
  },
];
