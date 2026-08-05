import { formatDuration } from "@/lib/format";
import { t } from "@/lib/i18n";
import { daySheet } from "@/lib/mock/timesheet";
import { cn } from "@/lib/utils";

/** «Деталі робочого часу»: три строки с цветными точками. */
export function DayDetailsCard({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "rounded-[16px] border border-border bg-surface p-4",
        className,
      )}
    >
      <h2 className="text-[17px] font-bold">{t.hours.details}</h2>

      <dl className="mt-3 space-y-3">
        <DetailRow
          label={t.hours.workTime}
          value={formatDuration(daySheet.workedSec)}
          dotClassName="bg-success"
        />
        <DetailRow
          label={t.hours.break}
          value={formatDuration(daySheet.breakSec)}
          dotClassName="bg-warning"
        />
        <DetailRow
          label={t.hours.outsideWorkTime}
          value={
            daySheet.outsideSec > 0
              ? formatDuration(daySheet.outsideSec)
              : t.common.dash
          }
          dotClassName="bg-text-dim"
        />
      </dl>
    </section>
  );
}

function DetailRow({
  label,
  value,
  dotClassName,
}: {
  label: string;
  value: string;
  dotClassName: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex min-w-0 items-center gap-2 text-[15px] font-medium text-text-muted">
        <span
          aria-hidden
          className={cn("size-2.5 shrink-0 rounded-full", dotClassName)}
        />
        <span className="truncate">{label}</span>
      </dt>
      <dd className="tabular shrink-0 text-[15px] font-bold">{value}</dd>
    </div>
  );
}
