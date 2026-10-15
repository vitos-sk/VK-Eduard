/**
 * Куда вернуть пользователя после перехода по ссылке из письма. Берём только путь внутри сайта:
 * иначе подставленный `?next=https://чужой.сайт` превратил бы наш адрес в открытый редирект.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;

  return next;
}

/**
 * Куда вернуть человека после входа, если его отправили на `/welcome` с этого адреса (ссылка из WhatsApp, уведомление).
 * С главной возвращать некуда, служебный параметр `_rsc` (предзагрузка страницы Next.js) в адрес не берём.
 */
export function returnPathAfterLogin(pathname: string, search: string): string | null {
  if (pathname === "/") return null;

  const params = new URLSearchParams(search);
  params.delete("_rsc");
  const query = params.toString();

  return query ? `${pathname}?${query}` : pathname;
}
