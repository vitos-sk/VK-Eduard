import { describe, expect, it } from "vitest";

import { isSnapshotPath, warmPathsFor } from "./warm-paths";

describe("warmPathsFor", () => {
  it("рабочему: основные экраны, без экранов шефа", () => {
    const paths = warmPathsFor("worker");

    expect(paths).toContain("/");
    expect(paths).toContain("/objects");
    expect(paths).toContain("/hours/salary");
    expect(paths).toContain("/time/manual");
    expect(paths).not.toContain("/dashboard");
    expect(paths).not.toContain("/more/team");
  });

  it("шефу: ещё и дашборд, команда и настройки фирмы", () => {
    const paths = warmPathsFor("boss");

    expect(paths).toContain("/dashboard");
    expect(paths).toContain("/more/team");
    expect(paths).toContain("/more/company");
  });

  it("без повторов, и все пути внутри сайта", () => {
    for (const role of ["worker", "boss"]) {
      const paths = warmPathsFor(role);

      expect(new Set(paths).size).toBe(paths.length);
      expect(paths.every((path) => path.startsWith("/") && !path.startsWith("//"))).toBe(true);
    }
  });
});

describe("isSnapshotPath", () => {
  it("страницы-детали сохраняем", () => {
    for (const path of ["/objects/123", "/reports/42", "/chats/9", "/checklists/7"]) {
      expect(isSnapshotPath(path)).toBe(true);
    }
  });

  it("списки, формы создания и правки — нет", () => {
    for (const path of ["/objects", "/reports", "/objects/new", "/reports/new", "/chats/new", "/checklists/new"]) {
      expect(isSnapshotPath(path)).toBe(false);
    }

    expect(isSnapshotPath("/objects/123/edit")).toBe(false);
    expect(isSnapshotPath("/checklists/7/edit")).toBe(false);
  });

  it("ссылка по токену и правка записи времени — нет", () => {
    expect(isSnapshotPath("/c/abc")).toBe(false);
    expect(isSnapshotPath("/time/manual/5")).toBe(false);
    expect(isSnapshotPath("/")).toBe(false);
  });
});
