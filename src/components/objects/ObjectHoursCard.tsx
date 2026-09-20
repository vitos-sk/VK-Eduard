"use client";

import { useMemo } from "react";

import { PeriodNavigator } from "@/components/hours/PeriodNavigator";
import {
  addMonthsSafe,
  useCompanyMonthEntries,
} from "@/components/objects/useCompanyMonthEntries";
import { formatHoursShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import { objectsStrings as s } from "@/lib/i18n/parts/objects";
import { cn } from "@/lib/utils";
import { buildSiteHoursList } from "@/modules/sites/hours";
import type { Site } from "@/modules/sites/queries";
import { Card } from "@/components/ui/card";

interface ObjectHoursCardProps {
  companyId: string;
  site: Site;
  className?: string;
}

/** Години й число людей по одному об'єкту за обраний місяць — тільки boss. */
export function ObjectHoursCard({ companyId, site, className }: ObjectHoursCardProps) {
  const { month, setMonth, entries, loaded, isLoading } = useCompanyMonthEntries(companyId, null);

  const stats = useMemo(
    () => buildSiteHoursList([site], entries)[0],
    [site, entries],
  );

  const monthTitle = `${t.months.nominative[month.getMonth()]} ${month.getFullYear()}`;

  return (
    <Card asChild><section className={cn(isLoading && "opacity-70",
        className,)}>
      <h2 className="text-[16px] font-bold">{s.detail.periodTitle}</h2>

      <PeriodNavigator
        className="mt-3 border-0 bg-surface-2"
        title={monthTitle}
        onPrev={() => setMonth((m) => addMonthsSafe(m, -1))}
        onNext={() => setMonth((m) => addMonthsSafe(m, 1))}
      />

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-[12px] bg-surface-2 p-3">
          <dt className="text-[12px] font-semibold text-text-muted">{s.detail.hours}</dt>
          <dd className="tabular mt-1 text-[20px] font-bold">
            {loaded ? formatHoursShort(stats.minutes) : t.common.dash}
          </dd>
        </div>
        <div className="rounded-[12px] bg-surface-2 p-3">
          <dt className="text-[12px] font-semibold text-text-muted">{s.detail.workers}</dt>
          <dd className="tabular mt-1 text-[20px] font-bold">
            {loaded ? stats.workerCount : t.common.dash}
          </dd>
        </div>
      </dl>
    </section></Card>
  );
}
