/**
 * Загрузка фото объекта целиком: сжать на телефоне, получить у сервера ссылку на загрузку, загрузить, дать серверу
 * записать фото обложкой. Одна и та же цепочка у обложки на странице объекта и у шага «Додайте фото» после
 * создания объекта, поэтому она вынесена сюда; сами действия передаются снаружи, чтобы проверять порядок без браузера.
 * Любой сбой на шаге обрывает цепочку исключением: следующие шаги не выполняются, обложка не меняется.
 */

export interface SiteCoverDeps {
  compress: (file: File) => Promise<Blob>;
  createUpload: (
    siteId: string,
  ) => Promise<{ error: string; path: null; token: null } | { error: null; path: string; token: string }>;
  /** Загружает файл по одноразовой ссылке; при ошибке бросает исключение. */
  upload: (path: string, token: string, blob: Blob) => Promise<void>;
  setPhoto: (siteId: string, path: string) => Promise<{ error: string | null }>;
}

/** Возвращает путь загруженного фото. */
export async function uploadSiteCover(siteId: string, file: File, deps: SiteCoverDeps): Promise<string> {
  const blob = await deps.compress(file);

  const slot = await deps.createUpload(siteId);
  if (slot.error !== null) throw new Error(slot.error);

  await deps.upload(slot.path, slot.token, blob);

  const saved = await deps.setPhoto(siteId, slot.path);
  if (saved.error) throw new Error(saved.error);

  return slot.path;
}
