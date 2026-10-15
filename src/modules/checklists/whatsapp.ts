import { fmt } from "@/lib/format";

/** `text` — список прямо в сообщении (читается и без приложения); `link` — короткое сообщение со ссылкой. */
export type ShareFormat = "text" | "link";

/** Больше пунктов в сообщение не кладём: хвост заменяется строкой «… ще N». */
export const WHATSAPP_MAX_ITEMS = 30;

export interface ShareInput {
  title: string;
  siteName: string | null;
  items: readonly string[];
  /** Готовая подпись числа пунктов («7 пунктів») для короткого формата. */
  countLabel: string;
  url: string;
  format: ShareFormat;
}

/** Тексты приходят из словаря (три языка): `moreItems` — «… ще {n}», `linkOnly` — «Чеклист «{title}», {count}». */
export interface ShareTexts {
  openInApp: string;
  moreItems: string;
  linkOnly: string;
}

/** Звёздочки в названии ломали бы жирный шрифт WhatsApp. */
function plain(value: string): string {
  return value.replace(/[*_~`]/g, "").trim();
}

export function buildShareMessage(input: ShareInput, texts: ShareTexts): string {
  const title = plain(input.title);

  if (input.format === "link") {
    return `${fmt(texts.linkOnly, { title, count: input.countLabel })}\n${input.url}`;
  }

  const head = input.siteName ? `*${title}* · ${plain(input.siteName)}` : `*${title}*`;
  const shown = input.items.slice(0, WHATSAPP_MAX_ITEMS);
  const lines = shown.map((text) => `☐ ${text}`);
  const rest = input.items.length - shown.length;

  if (rest > 0) lines.push(fmt(texts.moreItems, { n: rest }));

  return [head, lines.join("\n"), "", texts.openInApp, input.url].join("\n");
}

/** Ссылка, которая открывает WhatsApp с готовым текстом; кому отправить, человек выбирает сам. */
export function whatsAppUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
