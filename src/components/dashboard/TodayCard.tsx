import { fmt, formatHoursShort, formatTimeShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { TodayOverview } from "@/modules/dashboard/aggregate";
import { Card } from "@/components/ui/card";

interface TodayCardProps {
  overview: TodayOverview;
  /** Вихідні — не нагадуємо, що хтось «ще без запису». */
  isWorkday: boolean;
  className?: string;
}

/** Блок «Зараз на роботі»: хто на зміні й де, скільки відмічено, хто ще мовчить. */
export function TodayCard({ overview, isWorkday, className }: TodayCardProps) {
  const copy = t.dashboard;

  return (
    <Card asChild padding="lg"><section className={className}>
      <h3 className="text-[17px] font-bold">{copy.nowTitle}</h3>

      {overview.workingNow.length === 0 ? (
        <p className="mt-2 text-[14px] font-medium text-text-muted">{copy.nowEmpty}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2.5">
          {overview.workingNow.map((person) => (
            <li key={person.id} className="flex items-center gap-2.5">
              <i aria-hidden className="size-2 shrink-0 rounded-full bg-success" />
              <p className="min-w-0 flex-1 truncate text-[14px] font-bold">
                {person.name}
                <span className="font-medium text-text-muted">
                  {" · "}
                  {person.siteName ?? copy.noSite}
                </span>
              </p>
              <p className="tabular shrink-0 text-[13px] font-medium text-text-muted">
                {fmt(copy.nowSince, { time: formatTimeShort(person.since) })}
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 border-t border-border pt-3 text-[14px] font-medium text-text-muted">
        {fmt(copy.todayHoursLogged, { hours: formatHoursShort(overview.totalMinutes) })}
      </p>

      {isWorkday && overview.withoutEntries.length > 0 && (
        <p className="mt-1.5 text-[14px] font-medium text-warning-fg">
          {fmt(copy.withoutEntries, {
            names: overview.withoutEntries.map((worker) => worker.name).join(", "),
          })}
        </p>
      )}
    </section></Card>
  );
}
