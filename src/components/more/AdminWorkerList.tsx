"use client";

import { formatHoursShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WorkerHours } from "@/modules/team/hours";

interface AdminWorkerListProps {
  items: readonly WorkerHours[];
  selectedIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
}

/**
 * Ранжований список робітників з чекбоксами і прогрес-баром відносно
 * лідера — та сама візуалізація, що й `TopList` на `/dashboard`
 * (`src/components/dashboard/TopList.tsx`), тільки інтерактивна: весь
 * рядок — це чекбокс. Окремий bar-chart поруч не додаємо: він показував
 * би той самий єдиний показник (години на робітника) вдруге.
 */
export function AdminWorkerList({ items, selectedIds, onToggle }: AdminWorkerListProps) {
  const maxMinutes = items[0]?.minutes ?? 0;

  return (
    <ul className="mt-1 flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-3">
      {items.map((item) => {
        const isChecked = selectedIds.has(item.id);

        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onToggle(item.id)}
              aria-pressed={isChecked}
              className={cn(
                "flex w-full items-center gap-3 rounded-[14px] border p-3 text-left",
                "transition-colors duration-150",
                isChecked ? "border-brand bg-brand/10" : "border-border bg-surface-2",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-[6px] border-2",
                  isChecked ? "border-brand bg-brand" : "border-text-dim",
                )}
              >
                {isChecked && (
                  <svg viewBox="0 0 16 16" className="size-3 text-brand-ink" fill="none">
                    <path
                      d="M3 8.5 6.5 12 13 4.5"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>

              <p className="min-w-0 flex-1 truncate text-[14px] font-bold">{item.name}</p>

              <div className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-surface lg:w-32">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${maxMinutes === 0 ? 0 : (item.minutes / maxMinutes) * 100}%` }}
                />
              </div>

              <p className="tabular w-14 shrink-0 text-right text-[13px] font-bold">
                {formatHoursShort(item.minutes)}
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
