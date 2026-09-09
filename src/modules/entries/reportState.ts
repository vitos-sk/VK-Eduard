import type { WorkEntry } from "./types";

/**
 * Три состояния карточки из REPORTS.md, раздел 2 — не поля в базе,
 * а вычисляемый признак. Порядок проверки важен: открытая запись —
 * «Триває», даже если у неё уже есть описание.
 */
export type ReportState = "ongoing" | "no_description" | "ready";

export function reportState(
  entry: Pick<WorkEntry, "ended_at" | "description">,
  photoCount: number,
): ReportState {
  if (entry.ended_at === null) {
    return "ongoing";
  }

  if (entry.description === "" && photoCount === 0) {
    return "no_description";
  }

  return "ready";
}
