/** Предел совпадает с проверкой в базе (`chat_messages_shape`). */
export const MESSAGE_MAX = 2000;

/** Текст сообщения для отправки: без пробелов по краям, длиннее предела режется; пустое — `null`. */
export function normalizeMessage(text: string): string | null {
  const value = text.trim();

  return value === "" ? null : value.slice(0, MESSAGE_MAX);
}

export function totalUnread(chats: readonly { unread: number }[]): number {
  return chats.reduce((sum, chat) => sum + chat.unread, 0);
}

/** Цифра на значке: больше 99 — «99+», чтобы значок не растягивался. */
export function badgeLabel(count: number): string {
  return count > 99 ? "99+" : String(count);
}

/** Что показать вторым рядком в списке чатов. */
export interface ChatPreviewLabels {
  you: string;
  /** «Чеклист: {title}» */
  checklist: string;
  checklistDeleted: string;
  empty: string;
}

export interface ChatPreviewInput {
  lastKind: "text" | "checklist" | null;
  lastBody: string | null;
  lastTitle: string | null;
  lastSenderId: string | null;
}

export type ChatPreview = { kind: "text" | "checklist" | "empty"; text: string };

/** Превью последнего сообщения: свои с пометкой «Ви:», карточка чеклиста — с его названием. */
export function chatPreview(chat: ChatPreviewInput, meId: string, labels: ChatPreviewLabels): ChatPreview {
  if (chat.lastKind === null) return { kind: "empty", text: labels.empty };

  if (chat.lastKind === "checklist") {
    return {
      kind: "checklist",
      text: chat.lastTitle ? labels.checklist.replace("{title}", chat.lastTitle) : labels.checklistDeleted,
    };
  }

  const text = (chat.lastBody ?? "").replace(/\s+/g, " ").trim();

  return { kind: "text", text: chat.lastSenderId === meId ? `${labels.you}${text}` : text };
}

/** Сообщения в переписке не изменились: опрос не должен перерисовывать экран и сбрасывать прокрутку зря. */
export function sameMessages(
  a: readonly { id: string; checklist: { done: number; total: number } | null }[],
  b: readonly { id: string; checklist: { done: number; total: number } | null }[],
): boolean {
  if (a.length !== b.length) return false;

  return a.every((message, index) => {
    const other = b[index];

    return (
      message.id === other.id &&
      message.checklist?.done === other.checklist?.done &&
      message.checklist?.total === other.checklist?.total
    );
  });
}
