import { Building2, Clock, Users } from "lucide-react";

import { StatTile } from "@/components/dashboard/StatTile";
import { TopList } from "@/components/dashboard/TopList";
import { fmt, formatHoursShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import { buildOverview, buildTopWorkers } from "@/modules/dashboard/aggregate";
import type { WorkEntryWithNames } from "@/modules/entries/types";

interface CompanyDashboardProps {
  month: Date;
  entries: readonly WorkEntryWithNames[];
  workersCount: number;
  activeObjectsCount: number;
  className?: string;
}

/**
 * Сводные цифры по компании за месяц + топ работников по часам.
 * Показывается на «Головній» только для `boss` — раньше жил в отдельной
 * десктопной `/admin`, теперь часть обычной адаптивной вёрстки.
 *
 * Переиспользует ту же агрегацію (`buildOverview`/`buildTopWorkers`) і
 * список (`TopList`), що і повна сторінка `/dashboard` — щоб цифри за
 * місяць на обох екранах завжди збігались (раніше тут була окрема
 * ручна агрегація по `author_full_name`, яка розходилась з `/dashboard`
 * при однакових іменах у різних співробітників).
 */
export function CompanyDashboard({
  month,
  entries,
  workersCount,
  activeObjectsCount,
  className,
}: CompanyDashboardProps) {
  const overview = buildOverview(entries);
  const topWorkers = buildTopWorkers(entries).slice(0, 8);

  const monthTitle = `${t.months.nominative[month.getMonth()]} ${month.getFullYear()}`;

  return (
    <div className={className}>
      <h2 className="text-[22px] font-extrabold tracking-tight">{t.admin.dashboard.title}</h2>
      <p className="mt-1 text-[14px] font-semibold text-text-muted">
        {fmt(t.admin.dashboard.subtitle, { month: monthTitle })}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          icon={Clock}
          label={t.admin.dashboard.monthHours}
          value={formatHoursShort(overview.totalMinutes)}
        />
        <StatTile
          icon={Users}
          label={t.admin.dashboard.activeWorkers}
          value={String(workersCount)}
        />
        <StatTile
          icon={Building2}
          label={t.admin.dashboard.activeObjects}
          value={String(activeObjectsCount)}
        />
      </div>

      <TopList
        className="mt-8"
        title={t.admin.dashboard.topWorkersTitle}
        items={topWorkers}
        emptyLabel={t.admin.dashboard.topWorkersEmpty}
      />
    </div>
  );
}
