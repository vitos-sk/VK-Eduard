import { formatDuration } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { WorkEntry } from "@/modules/entries/types";
import type { DayAggregate } from "@/modules/entries/period";
import { cn } from "@/lib/utils";

interface DayDetailsCardProps {
  aggregate: DayAggregate;
  entries: readonly WorkEntry[];
  /** Имя объекта по `site_id` — для строки «Об'єкти». */
  siteNameById: ReadonlyMap<string, string>;
  className?: string;
}

/** «Деталі робочого часу»: відпрацьовано, перерва, об'єкти дня. */
export function DayDetailsCard({
  aggregate,
  entries,
  siteNameById,
  className,
}: DayDetailsCardProps) {
  const objectsLabel = objectsSummary(entries, siteNameById);

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
          value={formatDuration(aggregate.workedMinutes * 60)}
          dotClassName="bg-success"
        />
        <DetailRow
          label={t.hours.break}
          value={formatDuration(aggregate.breakMinutes * 60)}
          dotClassName="bg-warning"
        />
        <DetailRow
          label={t.hours.objects}
          value={objectsLabel}
          dotClassName="bg-text-dim"
        />
      </dl>
    </section>
  );
}

/** Названия объектов дня без повторов, через кому; ни одной записи — тире. */
function objectsSummary(
  entries: readonly WorkEntry[],
  siteNameById: ReadonlyMap<string, string>,
): string {
  if (entries.length === 0) {
    return t.common.dash;
  }

  const names = new Set(
    entries.map((entry) =>
      entry.site_id ? (siteNameById.get(entry.site_id) ?? t.hours.noObject) : t.hours.noObject,
    ),
  );

  return Array.from(names).join(", ");
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
      <dd className="tabular shrink-0 max-w-[55%] truncate text-right text-[15px] font-bold">
        {value}
      </dd>
    </div>
  );
}
