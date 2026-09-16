import type { WorkEntryWithNames } from "@/modules/entries/types";
import type { Worker } from "@/modules/team/queries";

export interface WorkerHours {
  id: string;
  name: string;
  minutes: number;
}

/**
 * Злиття всіх робітників компанії з їхніми годинами за період — на відміну
 * від рейтингу на `/dashboard` (`buildTopWorkers`, рахує тільки тих, у кого
 * є записи), тут потрібен повний список: чекбокси в адмінці мають включати
 * і тих, хто цього місяця ще нічого не відмітив (0 год).
 */
export function buildWorkerHoursList(
  workers: readonly Pick<Worker, "id" | "full_name">[],
  entries: readonly Pick<WorkEntryWithNames, "author_id" | "total_minutes">[],
): WorkerHours[] {
  const minutesByAuthor = new Map<string, number>();

  for (const entry of entries) {
    minutesByAuthor.set(
      entry.author_id,
      (minutesByAuthor.get(entry.author_id) ?? 0) + (entry.total_minutes ?? 0),
    );
  }

  return workers
    .map((worker) => ({
      id: worker.id,
      name: worker.full_name,
      minutes: minutesByAuthor.get(worker.id) ?? 0,
    }))
    .sort((a, b) => b.minutes - a.minutes);
}
