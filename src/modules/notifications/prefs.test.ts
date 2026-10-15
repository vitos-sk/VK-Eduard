import { describe, expect, it } from "vitest";

import { DEFAULT_PREFS, isPrefKey, prefsFromRow } from "./prefs";

describe("prefsFromRow", () => {
  it("нет строки — всё включено", () => {
    expect(prefsFromRow(null)).toEqual({ reportReminder: true, chatMessages: true, chatChecklists: true, checklistDone: true });
  });

  it("переносит значения из строки базы", () => {
    const prefs = prefsFromRow({
      user_id: "u1",
      report_reminder: false,
      chat_messages: true,
      chat_checklists: false,
      checklist_done: true,
    });

    expect(prefs).toEqual({ reportReminder: false, chatMessages: true, chatChecklists: false, checklistDone: true });
  });

  it("возвращает копию, а не общий объект по умолчанию", () => {
    const prefs = prefsFromRow(undefined);
    prefs.chatMessages = false;

    expect(DEFAULT_PREFS.chatMessages).toBe(true);
  });
});

describe("isPrefKey", () => {
  it("узнаёт настоящие настройки и отсекает чужие ключи", () => {
    expect(isPrefKey("chatMessages")).toBe(true);
    expect(isPrefKey("user_id")).toBe(false);
    expect(isPrefKey("__proto__")).toBe(false);
    expect(isPrefKey("toString")).toBe(false);
    expect(isPrefKey(5)).toBe(false);
  });
});
