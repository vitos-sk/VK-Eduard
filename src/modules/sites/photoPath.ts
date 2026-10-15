/** Бакет обложек объектов. */
export const SITE_PHOTOS_BUCKET = "site-photos";

/** Путь обложки: `{фирма}/{объект}/{uuid}.webp` — по первым двум папкам хранилище разграничивает доступ. */
export function sitePhotoPath(companyId: string, siteId: string, fileId: string): string {
  return `${companyId}/${siteId}/${fileId}.webp`;
}

const FILE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/i;

/**
 * Путь пришёл с телефона, поэтому ему нельзя верить: сервером записывается в `sites.photo_path` только путь
 * именно этого объекта этой фирмы и именно такого вида. Чужую папку, `..` и лишние уровни отсекаем.
 */
export function isSitePhotoPath(path: string, companyId: string, siteId: string): boolean {
  const prefix = `${companyId}/${siteId}/`;

  return path.startsWith(prefix) && FILE_PATTERN.test(path.slice(prefix.length));
}
