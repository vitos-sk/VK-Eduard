import { describe, expect, it } from "vitest";

import { hasTopBarCorner } from "./topBar";

describe("hasTopBarCorner", () => {
  it("есть на пяти главных экранах", () => {
    for (const path of ["/", "/objects", "/hours", "/reports", "/dashboard"]) {
      expect(hasTopBarCorner(path)).toBe(true);
    }
  });

  it("нет на вложенных страницах, формах, чатах и настройках", () => {
    for (const path of ["/objects/123", "/reports/new", "/reports/abc", "/hours/salary", "/chats", "/chats/1", "/more", "/time/manual"]) {
      expect(hasTopBarCorner(path)).toBe(false);
    }
  });
});
