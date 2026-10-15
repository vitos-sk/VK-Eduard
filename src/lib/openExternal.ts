/**
 * Открывает внешнюю ссылку (например, WhatsApp) в новой вкладке, не уводя само приложение.
 * Нельзя передавать `noopener` в `window.open`: тогда браузер всегда возвращает `null`, и приложение
 * заодно переходило бы по ссылке в своей вкладке. Связь с новой вкладкой обрываем сами.
 * Не дал открыть новую вкладку (блокировщик всплывающих окон) — открываем в этой, вернуться можно кнопкой «назад».
 */
export function openExternal(url: string, win: Pick<Window, "open" | "location"> = window): void {
  const opened = win.open(url, "_blank");

  if (opened) {
    opened.opener = null;
    return;
  }

  win.location.href = url;
}
