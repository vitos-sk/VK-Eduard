import type { WorkStatus } from "@/lib/types";

/**
 * Объект в архиве, если его архивировали руками (`archived_at`) или он завершён (`status = completed`):
 * завершённый объект уходит в архив сам, без отдельного нажатия и без фоновой задачи. Так же сразу попадают
 * в архив и объекты, завершённые раньше. Вернуть объект из архива — значит снять отметку и, если он был
 * завершён, снова сделать его «В роботі» (`setSiteArchived`).
 */
export function isSiteArchived(site: { archived_at: string | null; status: WorkStatus | string }): boolean {
  return site.archived_at !== null || site.status === "completed";
}
