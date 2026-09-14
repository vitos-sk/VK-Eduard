// src/components/dashboard/TopList.tsx
import { formatHoursShort } from "@/lib/format";
import type { RankedItem } from "@/modules/dashboard/aggregate";

interface TopListProps {
  title: string;
  items: readonly RankedItem[];
  emptyLabel: string;
}

/**
 * Ранжований список з прогрес-баром відносно лідера — та сама вёрстка, що
 * раніше жила тільки в `CompanyDashboard.topWorkers`, тепер спільна для
 * «Топ-об'єкти» і «Години по співробітниках» на повній сторінці дашборда.
 */
export function TopList({ title, items, emptyLabel }: TopListProps) {
  const maxMinutes = items[0]?.minutes ?? 0;

  return (
    <section className="rounded-[16px] border border-border bg-surface p-5">
      <h3 className="text-[17px] font-bold">{title}</h3>

      {items.length === 0 ? (
        <p className="mt-2 text-[14px] font-medium text-text-muted">{emptyLabel}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3">
              <p className="min-w-0 flex-1 truncate text-[14px] font-bold">{item.name}</p>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${maxMinutes === 0 ? 0 : (item.minutes / maxMinutes) * 100}%` }}
                />
              </div>
              <p className="tabular w-16 shrink-0 text-right text-[14px] font-bold">
                {formatHoursShort(item.minutes)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
