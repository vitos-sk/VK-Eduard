import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatHoursShort, minutesToTime } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { DayAggregate } from "@/modules/entries/period";
import type { WorkStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DaySummaryCardProps {
  aggregate: DayAggregate;
  className?: string;
}

/** Сводка дня: крупная метрика, статус и три колонки — початок / завершення / перерва. */
export function DaySummaryCard({ aggregate, className }: DaySummaryCardProps) {
  const status: WorkStatus = aggregate.hasOpenEntry
    ? "in_progress"
    : "completed";

  return (
    <section
      className={cn(
        "rounded-[16px] border border-border bg-surface p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="tabular text-[34px] leading-none font-extrabold">
            {formatHoursShort(aggregate.workedMinutes)}
          </p>
          <p className="mt-1.5 text-[13px] font-medium text-text-muted">
            {t.hours.workedToday}
          </p>
        </div>

        {aggregate.earliestStart !== null && <StatusBadge status={status} />}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4">
        <SummaryCell
          label={t.hours.start}
          value={aggregate.earliestStart ?? t.common.dash}
        />
        <SummaryCell
          label={t.hours.finish}
          value={aggregate.latestEnd ?? t.common.dash}
        />
        <SummaryCell
          label={t.hours.break}
          value={minutesToTime(aggregate.breakMinutes)}
        />
      </div>
    </section>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[13px] font-medium text-text-muted">{label}</p>
      <p className="tabular mt-1 text-[17px] font-bold">{value}</p>
    </div>
  );
}
