// src/components/dashboard/TodayCard.tsx
import { fmt, formatHoursShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { TodayOverview } from "@/modules/dashboard/aggregate";
import { Card } from "@/components/ui/card";

interface TodayCardProps {
  overview: TodayOverview;
  activeWorkersCount: number;
  className?: string;
}

/** Блок «Сьогодні»: скільки з усіх активних відмітились + бейджі відкритих змін. */
export function TodayCard({ overview, activeWorkersCount, className }: TodayCardProps) {
  return (
    <Card asChild padding="lg"><section className={className}>
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

        {overview.openShifts.map((shift) => (
          <span
            key={shift.id}
            className="rounded-full bg-surface-2 px-3 py-1 text-[13px] font-semibold text-text-muted"
          >
            {t.dashboard.todayOpen} · {shift.name}
          </span>
        ))}
      </div>

      <p className="mt-2 text-[14px] font-medium text-text-muted">
        {fmt(t.dashboard.todayHoursLogged, { hours: formatHoursShort(overview.totalMinutes) })}
      </p>
    </section></Card>
  );
}
