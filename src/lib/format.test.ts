import { describe, expect, it } from "vitest";

import { pluralize } from "./format";

const UK = { one: "{n} зміна", few: "{n} зміни", many: "{n} змін" };
const EN = { one: "{n} shift", few: "{n} shifts", many: "{n} shifts" };

describe("pluralize", () => {
  it("украинский: три формы", () => {
    expect(pluralize(1, "uk", UK)).toBe("1 зміна");
    expect(pluralize(2, "uk", UK)).toBe("2 зміни");
    expect(pluralize(5, "uk", UK)).toBe("5 змін");
    expect(pluralize(11, "uk", UK)).toBe("11 змін");
    expect(pluralize(21, "uk", UK)).toBe("21 зміна");
  });

  it("английский: две формы", () => {
    expect(pluralize(1, "en", EN)).toBe("1 shift");
    expect(pluralize(3, "en", EN)).toBe("3 shifts");
  });
});
