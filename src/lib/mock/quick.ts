import type { Dict } from "@/lib/i18n";
import type { QuickAction } from "@/lib/types";

/**
 * Пункты листа быстрых действий (кнопка «+»).
 *
 * Отдельного пункта «Дорога / Поза об'єктом» больше нет: в форме ручного
 * ввода объект и так необязателен (`site_id = null`) — второй пункт,
 * ведущий туда же с другой подписью, только путал бы.
 */
export function getQuickActions(t: Dict): readonly QuickAction[] {
  return [
    {
      id: "create_report",
      title: t.quick.createReport.title,
      description: t.quick.createReport.description,
      href: "/reports/new",
    },
    {
      id: "create_checklist",
      title: t.quick.createChecklist.title,
      description: t.quick.createChecklist.description,
      href: "/checklists/new",
    },
    {
      id: "dashboard",
      title: t.quick.dashboard.title,
      description: t.quick.dashboard.description,
      href: "/dashboard",
    },
  ];
}
