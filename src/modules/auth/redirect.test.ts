import { describe, expect, it } from "vitest";

import { returnPathAfterLogin, safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it("пропускает пути внутри сайта", () => {
    expect(safeNextPath("/reset-password")).toBe("/reset-password");
    expect(safeNextPath("/more/profile?x=1")).toBe("/more/profile?x=1");
  });

  it("чужие адреса и странные значения заменяет на запасной путь", () => {
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("/\\evil.example")).toBe("/");
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath("")).toBe("/");
    expect(safeNextPath("relative", "/login")).toBe("/login");
  });
});

describe("returnPathAfterLogin", () => {
  it("с главной возвращать некуда", () => {
    expect(returnPathAfterLogin("/", "")).toBeNull();
    expect(returnPathAfterLogin("/", "?x=1")).toBeNull();
  });

  it("ссылка из WhatsApp: путь сохраняется", () => {
    expect(returnPathAfterLogin("/c/8fa2c91d0b3e7a64", "")).toBe("/c/8fa2c91d0b3e7a64");
  });

  it("параметры запроса сохраняются, служебный _rsc отбрасывается", () => {
    expect(returnPathAfterLogin("/checklists/abc", "?send=1&_rsc=xyz")).toBe("/checklists/abc?send=1");
    expect(returnPathAfterLogin("/chats/abc", "?_rsc=xyz")).toBe("/chats/abc");
  });
});
