import { describe, expect, it } from "vitest";

import { isServiceError } from "./service-error";

describe("isServiceError", () => {
  it("неверный пароль или email — не сбой сервиса", () => {
    expect(isServiceError({ status: 400 })).toBe(false);
    expect(isServiceError({ status: 401 })).toBe(false);
    expect(isServiceError({ status: 422 })).toBe(false);
  });

  it("проект ограничен по тарифу (402) — сбой сервиса, а не пароль", () => {
    expect(isServiceError({ status: 402 })).toBe(true);
  });

  it("лимит запросов, ошибки сервера и обрыв связи — сбой сервиса", () => {
    expect(isServiceError({ status: 429 })).toBe(true);
    expect(isServiceError({ status: 500 })).toBe(true);
    expect(isServiceError({ status: 503 })).toBe(true);
    expect(isServiceError({ status: 0 })).toBe(true);
    expect(isServiceError({})).toBe(true);
  });
});
