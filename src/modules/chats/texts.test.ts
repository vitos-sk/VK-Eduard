import { describe, expect, it } from "vitest";

import { LOCALES } from "@/lib/i18n/locales";

import { chatPushText, chatUrl, siteSender } from "./texts";

describe("chatPushText", () => {
  it("сообщение: заголовок — имя, текст — само сообщение", () => {
    expect(chatPushText("message", "uk", { name: "Олег", text: "Беру пальник" })).toEqual({
      title: "Олег",
      body: "Беру пальник",
    });
  });

  it("длинное сообщение обрезается с многоточием", () => {
    const { body } = chatPushText("message", "uk", { name: "Олег", text: "а".repeat(500) });

    expect(body).toHaveLength(140);
    expect(body.endsWith("…")).toBe(true);
  });

  it("чеклист: имя в заголовке, название и число пунктов в тексте", () => {
    const text = chatPushText("checklist", "uk", { name: "Максим", title: "Перед виїздом", total: 7 });

    expect(text.title).toBe("Новий чеклист від Максим");
    expect(text.body).toBe("«Перед виїздом» · 7 пунктів");
  });

  it("число пунктов склоняется по правилам языка получателя", () => {
    expect(chatPushText("checklist", "uk", { name: "М", title: "Т", total: 1 }).body).toContain("1 пункт");
    expect(chatPushText("checklist", "uk", { name: "М", title: "Т", total: 3 }).body).toContain("3 пункти");
    expect(chatPushText("checklist", "en", { name: "M", title: "T", total: 1 }).body).toContain("1 item");
    expect(chatPushText("checklist", "en", { name: "M", title: "T", total: 4 }).body).toContain("4 items");
  });

  it("выполнен: кто, что и сколько", () => {
    const text = chatPushText("done", "en", { name: "Oleg", title: "Handover", done: 5, total: 5 });

    expect(text.title).toBe("Checklist completed");
    expect(text.body).toBe("Oleg: “Handover” · 5 of 5");
  });

  it("есть тексты на каждом языке приложения", () => {
    for (const locale of LOCALES) {
      for (const kind of ["checklist", "done"] as const) {
        const text = chatPushText(kind, locale, { name: "A", title: "B", done: 1, total: 2 });

        expect(text.title.length).toBeGreaterThan(0);
        expect(text.body.length).toBeGreaterThan(0);
      }
    }
  });

  it("неизвестный язык из базы — украинский", () => {
    expect(chatPushText("done", "xx", { name: "A", title: "B", done: 1, total: 1 })).toEqual(
      chatPushText("done", "uk", { name: "A", title: "B", done: 1, total: 1 }),
    );
  });
});

describe("chatUrl", () => {
  it("ведёт в нужный чат", () => {
    expect(chatUrl("abc")).toBe("/chats/abc");
  });
});

describe("siteSender", () => {
  it("в чате объекта к имени добавляется объект", () => {
    expect(siteSender("Олег", "Дах Ван Дейк")).toBe("Олег · Дах Ван Дейк");
  });

  it("названия объекта нет — просто имя", () => {
    expect(siteSender("Олег", null)).toBe("Олег");
    expect(siteSender("Олег", undefined)).toBe("Олег");
    expect(siteSender("Олег", "")).toBe("Олег");
  });
});
