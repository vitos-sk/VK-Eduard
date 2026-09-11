import { describe, expect, it } from "vitest";

import { reportState } from "./reportState";

describe("reportState", () => {
  it("без опису і без фото — no_description", () => {
    expect(reportState({ description: "" }, 0)).toBe("no_description");
  });

  it("є опис — ready, навіть без фото", () => {
    expect(reportState({ description: "Монтаж мембрани" }, 0)).toBe("ready");
  });

  it("немає опису, але є фото — ready", () => {
    expect(reportState({ description: "" }, 2)).toBe("ready");
  });
});
