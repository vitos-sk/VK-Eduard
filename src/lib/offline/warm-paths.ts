/** Как часто обновляем сохранённые копии основных страниц. */
export const WARM_EVERY_MS = 1000 * 60 * 60 * 6;

/** Экраны, которые есть у всех: открываются без интернета после одного захода онлайн. */
const COMMON_PATHS = [
  "/",
  "/objects",
  "/hours",
  "/hours/salary",
  "/reports",
  "/chats",
  "/checklists",
  "/more",
  "/more/profile",
  "/more/language",
  "/more/notifications",
  "/more/about",
  "/time/manual",
  "/reports/new",
] as const;

/** Только у шефа: у рабочего эти страницы всё равно отправили бы его на главную. */
const BOSS_PATHS = ["/dashboard", "/more/team", "/more/company"] as const;

/** Какие страницы воркер скачивает заранее («прогрев»). */
export function warmPathsFor(role: string): string[] {
  return role === "boss" ? [...COMMON_PATHS, ...BOSS_PATHS] : [...COMMON_PATHS];
}

/**
 * Страницы-детали, которые сохраняем, когда человек их открыл: объект, отчёт, чат, чеклист.
 * Не берём формы создания (`/new`), правку (`/edit`), ссылку по токену и правку записи времени:
 * без сети они всё равно не пригодятся.
 */
export function isSnapshotPath(pathname: string): boolean {
  const match = /^\/(objects|reports|chats|checklists)\/([^/]+)$/.exec(pathname);

  return match !== null && match[2] !== "new";
}
