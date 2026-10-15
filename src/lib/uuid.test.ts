import { describe, expect, it } from "vitest";

import { isUuid } from "./uuid";

describe("isUuid", () => {
  it("принимает обычный uuid в любом регистре", () => {
    expect(isUuid("3f2c8a1e-9b4d-4c6a-8e21-5d7f0a9b1c34")).toBe(true);
    expect(isUuid("3F2C8A1E-9B4D-4C6A-8E21-5D7F0A9B1C34")).toBe(true);
  });

  it("отклоняет всё остальное", () => {
    expect(isUuid("")).toBe(false);
    expect(isUuid("abc")).toBe(false);
    expect(isUuid("3f2c8a1e9b4d4c6a8e215d7f0a9b1c34")).toBe(false);
    expect(isUuid("3f2c8a1e-9b4d-4c6a-8e21-5d7f0a9b1c34/../x")).toBe(false);
  });
});
