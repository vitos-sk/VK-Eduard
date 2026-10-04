import { Ticket } from "@/components/ui/ticket";
import { formatHoursShort } from "@/lib/format";
import type { RankedItem } from "@/modules/dashboard/aggregate";

interface TopListProps {
  title: string;
  items: readonly RankedItem[];
  emptyLabel: string;
  /** Подпись под списком, например «Без об'єкта: 6:00». */
  footer?: string;
  className?: string;
}

/** Ранжированный список: название, часы mono, трек-полоска доли относительно лидера. */
export function TopList({ title, items, emptyLabel, footer, className }: TopListProps) {
  const maxMinutes = items[0]?.minutes ?? 0;

  return (
    <Ticket asChild variant="flat" className={className}>
      <section>
        <h3 className="text-[15px] font-semibold">{title}</h3>

        {items.length === 0 ? (
          <p className="mt-2 text-[14px] text-ink-2">{emptyLabel}</p>
        ) : (
          <ul className="mt-3 flex flex-col">
            {items.map((item) => (
              <li
                key={item.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 py-2 not-first:border-t not-first:border-dashed not-first:border-perf first:pt-0"
              >
                <p className="truncate text-[14px] font-medium">{item.name}</p>
                <p className="tabular text-[14px] font-semibold">{formatHoursShort(item.minutes)}</p>
                <div className="relative col-span-2 h-2 rounded-xs bg-scale">
                  <div
                    className="absolute inset-y-0 left-0 rounded-xs bg-primary"
                    style={{ width: `${maxMinutes === 0 ? 0 : (item.minutes / maxMinutes) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        {footer && <p className="mt-2 text-[13px] text-ink-2">{footer}</p>}
      </section>
    </Ticket>
  );
}
