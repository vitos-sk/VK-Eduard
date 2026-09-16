import { describe, expect, it } from "vitest";

import { buildExportUrl } from "./formats";

describe("buildExportUrl", () => {
  it("будує URL без фільтра по робітниках за замовчуванням", () => {
    const url = buildExportUrl({ from: "2026-09-01", to: "2026-09-30", format: "csv" });
    expect(url).toBe("/api/export?from=2026-09-01&to=2026-09-30&format=csv&kind=hours");
  });

  it("додає workerIds через кому, якщо переданий список", () => {
    const url = buildExportUrl({
      from: "2026-09-01",
      to: "2026-09-30",
      format: "xlsx",
      workerIds: ["a", "b"],
    });
    expect(url).toContain("workerIds=a%2Cb");
  });

  it("workerIds має пріоритет над одиночним workerId", () => {
    const url = buildExportUrl({
      from: "2026-09-01",
      to: "2026-09-30",
      format: "pdf",
      workerId: "solo",
      workerIds: ["a", "b"],
    });
    expect(url).toContain("workerIds=a%2Cb");
    expect(url).not.toContain("workerId=solo");
  });

  it("використовує одиночний workerId, якщо workerIds не переданий", () => {
    const url = buildExportUrl({ from: "2026-09-01", to: "2026-09-30", format: "csv", workerId: "solo" });
    expect(url).toContain("workerId=solo");
  });

  it("ігнорує порожній список workerIds — трактує як «усі»", () => {
    const url = buildExportUrl({ from: "2026-09-01", to: "2026-09-30", format: "csv", workerIds: [] });
    expect(url).not.toContain("workerIds");
    expect(url).not.toContain("workerId=");
  });
});
