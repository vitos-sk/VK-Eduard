/** Секрет в ссылке на чеклист: 16 шестнадцатеричных символов (`checklists.share_token`). */
const TOKEN_PATTERN = /^[0-9a-f]{16}$/;

export function isShareToken(value: string): boolean {
  return TOKEN_PATTERN.test(value);
}

/** Ссылка, которую получает коллега в WhatsApp: открывает страницу чеклиста в приложении. */
export function shareUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, "")}/c/${token}`;
}
