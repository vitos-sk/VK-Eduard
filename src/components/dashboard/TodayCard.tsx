// src/components/dashboard/TodayCard.tsx
import { fmt, formatHoursShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { TodayOverview } from "@/modules/dashboard/aggregate";

interface TodayCardProps {
  overview: TodayOverview;
  activeWorkersCount: number;
}

/** Блок «Сьогодні»: скільки з усіх активних відмітились + бейджі відкритих змін. */
export function TodayCard({ overview, activeWorkersCount }: TodayCardProps) {
  return (
    <section className="rounded-[16px] border border-border bg-surface p-5">
      <h3 className="text-[13px] font-bold tracking-wide text-text-muted uppercase">
        {t.dashboard.todayTitle}
      </h3>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <p className="text-[28px] font-extrabold tracking-tight">
          {fmt(t.dashboard.todayActive, {
            active: overview.activeCount,
            total: activeWorkersCount,
          })}
        </p>

        {overview.openShiftNames.map((name) => (
          <span
            key={name}
            className="rounded-full bg-surface-2 px-3 py-1 text-[13px] font-semibold text-text-muted"
          >
            {t.dashboard.todayOpen} · {name}
          </span>
        ))}
      </div>

      <p className="mt-2 text-[14px] font-medium text-text-muted">
        {fmt(t.dashboard.todayHoursLogged, { hours: formatHoursShort(overview.totalMinutes) })}
      </p>
    </section>
  );
}
