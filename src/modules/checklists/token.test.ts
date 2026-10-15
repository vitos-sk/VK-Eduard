import { describe, expect, it } from "vitest";

import { isShareToken, shareUrl } from "./token";

describe("isShareToken", () => {
  it("принимает 16 шестнадцатеричных символов", () => {
    expect(isShareToken("8fa2c91d0b3e7a64")).toBe(true);
  });

  it("отклоняет всё остальное", () => {
    expect(isShareToken("")).toBe(false);
    expect(isShareToken("8FA2C91D0B3E7A64")).toBe(false);
    expect(isShareToken("8fa2c91d0b3e7a6")).toBe(false);
    expect(isShareToken("8fa2c91d0b3e7a64a")).toBe(false);
    expect(isShareToken("../../etc/passwd")).toBe(false);
    expect(isShareToken("nope-nope-nope-n")).toBe(false);
  });
});

describe("shareUrl", () => {
  it("склеивает адрес сайта и токен", () => {
    expect(shareUrl("https://vk-group-chi.vercel.app", "8fa2c91d0b3e7a64")).toBe(
      "https://vk-group-chi.vercel.app/c/8fa2c91d0b3e7a64",
    );
  });

  it("не удваивает слеш в конце адреса", () => {
    expect(shareUrl("https://example.com/", "8fa2c91d0b3e7a64")).toBe("https://example.com/c/8fa2c91d0b3e7a64");
  });
});
