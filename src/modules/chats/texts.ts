import { fmt, pluralize } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/locales";

/** Что случилось: пришло сообщение, прислали чеклист или коллега выполнил присланный ему чеклист. */
export type ChatPushKind = "message" | "checklist" | "done";

export interface ChatPushParams {
  /** Имя того, кто написал / прислал / выполнил. */
  name: string;
  /** Текст сообщения (для `message`). */
  text?: string;
  /** Название чеклиста (для `checklist` и `done`). */
  title?: string;
  done?: number;
  total?: number;
}

/** Куда ведёт нажатие на уведомление. */
export function chatUrl(chatId: string): string {
  return `/chats/${chatId}`;
}

/** Кто пишет в чате объекта: «Олег · Дах Ван Дейк». По заголовку уведомления видно, в каком объекте это сказано. */
export function siteSender(name: string, siteName: string | null | undefined): string {
  return siteName ? `${name} · ${siteName}` : name;
}

/** Предел длины текста в уведомлении: длинное сообщение там всё равно обрежет система. */
const BODY_MAX = 140;

/**
 * Уведомление уходит с сервера, а не рисуется в приложении, поэтому тексты на трёх языках лежат здесь
 * (как и у напоминания о звіте). Формулировки без рода: «від {name}», а не «надіслав / надіслала».
 */
const TEXTS: Record<Locale, { checklist: string; done: string; checklistBody: string; doneBody: string }> = {
  uk: {
    checklist: "Новий чеклист від {name}",
    done: "Чеклист виконано",
    checklistBody: "«{title}» · {count}",
    doneBody: "{name}: «{title}» · {done} з {total}",
  },
  en: {
    checklist: "New checklist from {name}",
    done: "Checklist completed",
    checklistBody: "“{title}” · {count}",
    doneBody: "{name}: “{title}” · {done} of {total}",
  },
  nl: {
    checklist: "Nieuwe checklist van {name}",
    done: "Checklist voltooid",
    checklistBody: "“{title}” · {count}",
    doneBody: "{name}: “{title}” · {done} van {total}",
  },
};

function clip(value: string): string {
  return value.length > BODY_MAX ? `${value.slice(0, BODY_MAX - 1)}…` : value;
}

export function chatPushText(kind: ChatPushKind, locale: string, params: ChatPushParams): { title: string; body: string } {
  const lang = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const texts = TEXTS[lang];
  const total = params.total ?? 0;
  const values = {
    name: params.name,
    title: params.title ?? "",
    done: params.done ?? 0,
    total,
    // «7 пунктів» / «7 items»: форма слова зависит от языка получателя.
    count: pluralize(total, lang, getDictionary(lang).checklists.count),
  };

  if (kind === "message") return { title: params.name, body: clip(params.text ?? "") };
  if (kind === "checklist") return { title: fmt(texts.checklist, values), body: clip(fmt(texts.checklistBody, values)) };

  return { title: texts.done, body: clip(fmt(texts.doneBody, values)) };
}
