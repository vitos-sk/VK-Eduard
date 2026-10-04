import { describe, expect, it } from "vitest";

import { aggregateSiteStats } from "./siteStats";

function report(
  siteId: string | null,
  overrides: { description?: string; photos?: number; workDate?: string } = {},
) {
  return {
    site_id: siteId,
    work_date: overrides.workDate ?? "2026-09-01",
    description: overrides.description ?? "",
    report_photos: Array.from({ length: overrides.photos ?? 0 }, (_, i) => ({
      id: `p${i}`,
      report_id: "r1",
      storage_path: `p${i}`,
      sort_order: i,
      width: null,
      height: null,
      size_bytes: null,
    })),
  };
}

describe("aggregateSiteStats", () => {
  it("рахує фото і звіти по кожному об'єкту", () => {
    const stats = aggregateSiteStats([
      report("s1", { photos: 2 }),
      report("s1", { description: "Залито фундамент" }),
      report("s2", { photos: 1 }),
    ]);

    expect(stats.get("s1")).toMatchObject({ photosCount: 2, reportsCount: 2 });
    expect(stats.get("s2")).toMatchObject({ photosCount: 1, reportsCount: 1 });
  });

  it("не рахує порожній звіт без опису і фото", () => {
    const stats = aggregateSiteStats([report("s1")]);

    expect(stats.get("s1")).toMatchObject({ photosCount: 0, reportsCount: 0 });
  });

  it("бере найсвіжішу дату і пропускає звіти без об'єкта", () => {
    const stats = aggregateSiteStats([
      report("s1", { photos: 1, workDate: "2026-09-03" }),
      report("s1", { photos: 1, workDate: "2026-09-10" }),
      report(null, { photos: 5 }),
    ]);

    expect(stats.size).toBe(1);
    expect(stats.get("s1")?.lastWorkedDate).toBe("2026-09-10");
  });
});
