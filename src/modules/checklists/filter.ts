import type { ChecklistListEntry } from "./queries";
import { isComplete } from "./progress";

export type ChecklistFilter = "all" | "mine" | "received" | "done";

export const CHECKLIST_FILTERS: readonly ChecklistFilter[] = ["all", "mine", "received", "done"];

export function matchesFilter(entry: ChecklistListEntry, filter: ChecklistFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "mine":
      return !entry.isReceived;
    case "received":
      return entry.isReceived;
    case "done":
      return isComplete(entry.progress);
  }
}

export function filterEntries(entries: readonly ChecklistListEntry[], filter: ChecklistFilter): ChecklistListEntry[] {
  return entries.filter((entry) => matchesFilter(entry, filter));
}

/** Сколько чеклистов в каждом разделе: числа на чипах «Усі · 4». */
export function countByFilter(entries: readonly ChecklistListEntry[]): Record<ChecklistFilter, number> {
  return {
    all: entries.length,
    mine: filterEntries(entries, "mine").length,
    received: filterEntries(entries, "received").length,
    done: filterEntries(entries, "done").length,
  };
}

export function isChecklistFilter(value: unknown): value is ChecklistFilter {
  return typeof value === "string" && (CHECKLIST_FILTERS as readonly string[]).includes(value);
}

/** Что показать на главной: сначала невыполненные (новые сверху), выполненные только если больше нечего. */
export function pickForHome(entries: readonly ChecklistListEntry[], limit: number): ChecklistListEntry[] {
  const open = entries.filter((entry) => !isComplete(entry.progress));
  const finished = entries.filter((entry) => isComplete(entry.progress));

  return [...open, ...finished].slice(0, limit);
}
