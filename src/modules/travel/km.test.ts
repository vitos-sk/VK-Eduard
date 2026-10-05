import { describe, expect, it } from "vitest";

import { parseKm } from "./km";

describe("parseKm", () => {
  it("пусто — не указано", () => {
    expect(parseKm("")).toBeNull();
    expect(parseKm("   ")).toBeNull();
  });

  it("целые и дробные, запятая или точка", () => {
    expect(parseKm("42")).toBe(42);
    expect(parseKm("42,5")).toBe(42.5);
    expect(parseKm("42.54")).toBe(42.5);
  });

  it("мусор и выход за пределы — NaN", () => {
    expect(parseKm("abc")).toBeNaN();
    expect(parseKm("-3")).toBeNaN();
    expect(parseKm("10000")).toBeNaN();
  });
});
