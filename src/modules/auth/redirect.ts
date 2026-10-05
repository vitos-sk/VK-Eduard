/**
 * Куда вернуть пользователя после перехода по ссылке из письма. Берём только путь внутри сайта:
 * иначе подставленный `?next=https://чужой.сайт` превратил бы наш адрес в открытый редирект.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;

  return next;
}
