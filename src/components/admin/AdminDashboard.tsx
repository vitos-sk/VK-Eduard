import { Clock, MapPin, Users } from "lucide-react";

import { fmt, formatHoursShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { WorkEntryWithNames } from "@/modules/entries/types";

interface AdminDashboardProps {
  month: Date;
  entries: readonly WorkEntryWithNames[];
  workersCount: number;
  activeObjectsCount: number;
}

/** Сводные цифры по компании за месяц + топ работников по часам. */
export function AdminDashboard({
  month,
  entries,
  workersCount,
  activeObjectsCount,
}: AdminDashboardProps) {
  const totalMinutes = entries.reduce((sum, entry) => sum + (entry.total_minutes ?? 0), 0);

  const minutesByWorker = new Map<string, number>();
  for (const entry of entries) {
    minutesByWorker.set(
      entry.author_full_name,
      (minutesByWorker.get(entry.author_full_name) ?? 0) + (entry.total_minutes ?? 0),
    );
  }

  const topWorkers = [...minutesByWorker.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const monthTitle = `${t.months.nominative[month.getMonth()]} ${month.getFullYear()}`;

  return (
    <div>
      <h1 className="text-[26px] font-extrabold tracking-tight">{t.admin.dashboard.title}</h1>
      <p className="mt-1 text-[14px] font-semibold text-text-muted">
        {fmt(t.admin.dashboard.subtitle, { month: monthTitle })}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          icon={Clock}
          label={t.admin.dashboard.monthHours}
          value={formatHoursShort(totalMinutes)}
        />
        <StatTile
          icon={Users}
          label={t.admin.dashboard.activeWorkers}
          value={String(workersCount)}
        />
        <StatTile
          icon={MapPin}
          label={t.admin.dashboard.activeObjects}
          value={String(activeObjectsCount)}
        />
      </div>

      <section className="mt-8 rounded-[16px] border border-border bg-surface p-5">
        <h2 className="text-[17px] font-bold">{t.admin.dashboard.topWorkersTitle}</h2>

        {topWorkers.length === 0 ? (
          <p className="mt-2 text-[14px] font-medium text-text-muted">
            {t.admin.dashboard.topWorkersEmpty}
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {topWorkers.map(([name, minutes]) => (
              <li key={name} className="flex items-center gap-3">
                <p className="min-w-0 flex-1 truncate text-[14px] font-bold">{name}</p>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{
                      width: `${Math.min(100, (minutes / topWorkers[0][1]) * 100)}%`,
                    }}
                  />
                </div>
                <p className="tabular w-16 shrink-0 text-right text-[14px] font-bold">
                  {formatHoursShort(minutes)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[16px] border border-border bg-surface p-5">
      <Icon className="size-5 text-brand" strokeWidth={2} aria-hidden />
      <p className="tabular mt-3 text-[28px] font-extrabold tracking-tight">{value}</p>
      <p className="mt-1 text-[13px] font-semibold text-text-muted">{label}</p>
    </div>
  );
}
