import { describe, expect, it } from "vitest";

import { MESSAGE_MAX, badgeLabel, chatPreview, normalizeMessage, sameMessages, totalUnread } from "./rules";

describe("normalizeMessage", () => {
  it("убирает пробелы по краям", () => {
    expect(normalizeMessage("  Привіт  ")).toBe("Привіт");
  });

  it("пустое и из одних пробелов — null", () => {
    expect(normalizeMessage("")).toBeNull();
    expect(normalizeMessage("  \n ")).toBeNull();
  });

  it("слишком длинное режется до предела", () => {
    expect(normalizeMessage("а".repeat(MESSAGE_MAX + 100))).toHaveLength(MESSAGE_MAX);
  });

  it("внутренние переносы строк сохраняются", () => {
    expect(normalizeMessage("раз\nдва")).toBe("раз\nдва");
  });
});

describe("totalUnread", () => {
  it("суммирует непрочитанное по чатам", () => {
    expect(totalUnread([{ unread: 1 }, { unread: 2 }, { unread: 0 }])).toBe(3);
  });

  it("нет чатов — ноль", () => {
    expect(totalUnread([])).toBe(0);
  });
});

describe("badgeLabel", () => {
  it("до 99 включительно — само число", () => {
    expect(badgeLabel(3)).toBe("3");
    expect(badgeLabel(99)).toBe("99");
  });

  it("больше 99 — «99+»", () => {
    expect(badgeLabel(100)).toBe("99+");
  });
});

const labels = { you: "Ви: ", checklist: "Чеклист: {title}", checklistDeleted: "Чеклист видалено", empty: "Напишіть перше повідомлення" };

describe("chatPreview", () => {
  it("чужое сообщение — как есть", () => {
    expect(chatPreview({ lastKind: "text", lastBody: "Беру пальник", lastTitle: null, lastSenderId: "olег" }, "me", labels)).toEqual({
      kind: "text",
      text: "Беру пальник",
    });
  });

  it("своё сообщение — с пометкой «Ви:»", () => {
    expect(chatPreview({ lastKind: "text", lastBody: "Ок", lastTitle: null, lastSenderId: "me" }, "me", labels).text).toBe("Ви: Ок");
  });

  it("переносы строк в превью схлопываются в пробел", () => {
    expect(chatPreview({ lastKind: "text", lastBody: "раз\n\nдва", lastTitle: null, lastSenderId: "x" }, "me", labels).text).toBe("раз два");
  });

  it("карточка чеклиста — с его названием", () => {
    expect(chatPreview({ lastKind: "checklist", lastBody: null, lastTitle: "Перед виїздом", lastSenderId: "x" }, "me", labels)).toEqual({
      kind: "checklist",
      text: "Чеклист: Перед виїздом",
    });
  });

  it("удалённый чеклист — понятная подпись", () => {
    expect(chatPreview({ lastKind: "checklist", lastBody: null, lastTitle: null, lastSenderId: "x" }, "me", labels).text).toBe("Чеклист видалено");
  });

  it("чат без сообщений — подсказка написать первым", () => {
    expect(chatPreview({ lastKind: null, lastBody: null, lastTitle: null, lastSenderId: null }, "me", labels)).toEqual({
      kind: "empty",
      text: "Напишіть перше повідомлення",
    });
  });
});

describe("sameMessages", () => {
  const text = (id: string) => ({ id, checklist: null });

  it("одинаковые списки — те же", () => {
    expect(sameMessages([text("1"), text("2")], [text("1"), text("2")])).toBe(true);
  });

  it("новое сообщение — не то же", () => {
    expect(sameMessages([text("1")], [text("1"), text("2")])).toBe(false);
  });

  it("прогресс в карточке изменился — не то же", () => {
    const card = (done: number) => ({ id: "c", checklist: { done, total: 3 } });

    expect(sameMessages([card(1)], [card(2)])).toBe(false);
    expect(sameMessages([card(2)], [card(2)])).toBe(true);
  });

  it("в карточке отметили другой пункт при том же числе отмеченных — не то же", () => {
    const withItems = (first: string | null, second: string | null) => ({
      id: "c",
      checklist: {
        done: 1,
        total: 2,
        items: [
          { id: "i1", doneAt: first },
          { id: "i2", doneAt: second },
        ],
      },
    });

    expect(sameMessages([withItems("t", null)], [withItems(null, "t")])).toBe(false);
    expect(sameMessages([withItems("t", null)], [withItems("t", null)])).toBe(true);
  });
});
