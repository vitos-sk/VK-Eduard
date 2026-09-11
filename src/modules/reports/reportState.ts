import type { SiteReport } from "./types";

/**
 * Два стани картки звіту (REPORTS.md, розділ 2, без «Триває» — того стану
 * часу тут більше немає).
 */
export type ReportState = "no_description" | "ready";

export function reportState(
  report: Pick<SiteReport, "description">,
  photoCount: number,
): ReportState {
  return report.description === "" && photoCount === 0 ? "no_description" : "ready";
}
