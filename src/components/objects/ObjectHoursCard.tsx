"use client";

import { useMemo } from "react";

import { PeriodNavigator } from "@/components/hours/PeriodNavigator";
import {
  addMonthsSafe,
  useCompanyMonthEntries,
} from "@/components/objects/useCompanyMonthEntries";
import { formatHoursShort } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { buildSiteHoursList } from "@/modules/sites/hours";
import type { Site } from "@/modules/sites/queries";
import { Ticket } from "@/components/ui/ticket";

interface ObjectHoursCardProps {
  companyId: string;
  site: Site;
  className?: string;
}

/** Години й число людей по одному об'єкту за обраний місяць — тільки boss. */
export function ObjectHoursCard({ companyId, site, className }: ObjectHoursCardProps) {
  const t = useT();
  const s = t.objectsUi;
  const { month, setMonth, entries, loaded, isLoading } = useCompanyMonthEntries(companyId, null);

  const stats = useMemo(
    () => buildSiteHoursList([site], entries)[0],
    [site, entries],
  );

  const monthTitle = `${t.months.nominative[month.getMonth()]} ${month.getFullYear()}`;

  return (
    <Ticket asChild variant="flat"><section className={cn(isLoading && "opacity-70",
        className,)}>
      <h2 className="text-[15px] font-semibold">{s.detail.periodTitle}</h2>

      <PeriodNavigator
        className="mt-3"
        title={monthTitle}
        onPrev={() => setMonth((m) => addMonthsSafe(m, -1))}
        onNext={() => setMonth((m) => addMonthsSafe(m, 1))}
      />

      <dl className="perf-t mt-3 grid grid-cols-2 gap-3 pt-3">
        <div>
          <dt className="text-[12px] text-ink-2">{s.detail.hours}</dt>
          <dd className="tabular mt-1 text-[20px] font-semibold">
            {loaded ? formatHoursShort(stats.minutes) : t.common.dash}
          </dd>
        </div>
        <div>
          <dt className="text-[12px] text-ink-2">{s.detail.workers}</dt>
          <dd className="tabular mt-1 text-[20px] font-semibold">
            {loaded ? stats.workerCount : t.common.dash}
          </dd>
        </div>
      </dl>
    </section></Ticket>
  );
}
