import { t } from "@/lib/i18n";
import type { QuickAction } from "@/lib/types";

/**
 * Пять пунктов листа быстрых действий (кнопка «+»), раздел 6, шаг 10 плана.
 * `accent` — цвет иконки: токен темы или HEX из таблицы шага.
 * `href: null` означает действие без своего экрана — по нему показывается тост.
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
    id: "outside",
    title: t.quick.outside.title,
    description: t.quick.outside.description,
    accent: "#60A5FA",
    href: "/time/manual?type=outside",
  },
  {
    id: "create_report",
    title: t.quick.createReport.title,
    description: t.quick.createReport.description,
    accent: "#A78BFA",
    href: null,
  },
];
