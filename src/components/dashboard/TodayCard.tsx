import { Ticket } from "@/components/ui/ticket";
import { fmt, formatHoursShort, formatTimeShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { TodayOverview } from "@/modules/dashboard/aggregate";
import { initialsOf } from "@/components/shared/Thumb";

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
    <Ticket asChild variant="flat" className={className}>
      <section>
        <h3 className="text-[15px] font-semibold">{copy.nowTitle}</h3>

        {overview.workingNow.length === 0 ? (
          <p className="mt-2 text-[14px] text-ink-2">{copy.nowEmpty}</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2.5">
            {overview.workingNow.map((person) => (
              <li key={person.id} className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="grid size-[30px] shrink-0 place-items-center rounded-md border border-edge bg-stub text-[12px] font-semibold"
                >
                  {initialsOf(person.name)}
                </span>
                <p className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">{person.name}</span>
                  <span className="block truncate text-[12px] text-ink-2">
                    {person.siteName ?? copy.noSite}
                  </span>
                </p>
                <p className="tabular shrink-0 text-[13px] text-ink-2">
                  {fmt(copy.nowSince, { time: formatTimeShort(person.since) })}
                </p>
              </li>
            ))}
          </ul>
        )}

        <p className="perf-t mt-3 pt-3 text-[13px] text-ink-2">
          {fmt(copy.todayHoursLogged, { hours: formatHoursShort(overview.totalMinutes) })}
        </p>

        {isWorkday && overview.withoutEntries.length > 0 && (
          <p className="mt-1.5 text-[13px] text-warn">
            {fmt(copy.withoutEntries, {
              names: overview.withoutEntries.map((worker) => worker.name).join(", "),
            })}
          </p>
        )}
      </section>
    </Ticket>
  );
}
