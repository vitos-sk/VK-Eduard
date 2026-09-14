// src/components/dashboard/DashboardScreen.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Clock, Users } from "lucide-react";

import { HoursChart } from "@/components/dashboard/HoursChart";
import { StatTile } from "@/components/dashboard/StatTile";
import { TodayCard } from "@/components/dashboard/TodayCard";
import { TopList } from "@/components/dashboard/TopList";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { SegmentedTabs } from "@/components/shared/SegmentedTabs";
import { formatHoursShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/modules/auth/session";
import {
  buildOverview,
  buildTodayOverview,
  buildTopSites,
  buildTopWorkers,
} from "@/modules/dashboard/aggregate";
import { buildHoursChartData, getPeriodRange, type DashboardPeriod } from "@/modules/dashboard/period";
import { getCompanyEntriesInRange } from "@/modules/entries/queries";
import type { WorkEntryWithNames } from "@/modules/entries/types";
import { dateKeyOf } from "@/modules/time/calc";

interface DashboardScreenProps {
  profile: Profile;
  initialPeriodEntries: readonly WorkEntryWithNames[];
  todayEntries: readonly WorkEntryWithNames[];
  activeWorkersCount: number;
}

const PERIOD_OPTIONS: readonly { value: DashboardPeriod; label: string }[] = [
  { value: "month", label: t.dashboard.periodMonth },
  { value: "quarter", label: t.dashboard.periodQuarter },
  { value: "year", label: t.dashboard.periodYear },
];

/**
 * Оркестратор сторінки `/dashboard`. Перший кадр (період «Місяць») приходить
 * із сервера, зміна періоду тягне дані з браузера — та сама схема, що і в
 * `HoursScreen`/`getCompanyEntriesInRange` (RLS сама обмежує компанією).
 * «Сьогодні» від періоду не залежить і не рефетчиться.
 */
export function DashboardScreen({
  profile,
  initialPeriodEntries,
  todayEntries,
  activeWorkersCount,
}: DashboardScreenProps) {
  const supabase = useMemo(() => createClient(), []);
  const referenceDate = useMemo(() => new Date(), []);

  const [period, setPeriod] = useState<DashboardPeriod>("month");
  const [periodEntries, setPeriodEntries] = useState<readonly WorkEntryWithNames[]>(
    initialPeriodEntries,
  );

  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    let cancelled = false;
    const { from, to } = getPeriodRange(period, referenceDate);

    getCompanyEntriesInRange(supabase, profile.company_id, dateKeyOf(from), dateKeyOf(to))
      .then((entries) => {
        if (!cancelled) setPeriodEntries(entries);
      })
      .catch(() => {
        // Мережа моргнула — лишаємо попередні дані на екрані.
      });

    return () => {
      cancelled = true;
    };
  }, [supabase, profile.company_id, period, referenceDate]);

  const overview = useMemo(() => buildOverview(periodEntries), [periodEntries]);
  const topSites = useMemo(() => buildTopSites(periodEntries), [periodEntries]);
  const topWorkers = useMemo(() => buildTopWorkers(periodEntries), [periodEntries]);
  const chartData = useMemo(
    () => buildHoursChartData(period, referenceDate, periodEntries),
    [period, referenceDate, periodEntries],
  );
  const today = useMemo(() => buildTodayOverview(todayEntries), [todayEntries]);

  return (
    <div className="pb-6">
      <ScreenHeader
        title={t.dashboard.title}
        action={
          <SegmentedTabs
            label={t.dashboard.title}
            options={PERIOD_OPTIONS}
            value={period}
            onChange={setPeriod}
            className="mx-0 w-auto px-0"
          />
        }
      />

      <div className="px-4 lg:px-0">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile icon={Clock} label={t.dashboard.totalHours} value={formatHoursShort(overview.totalMinutes)} />
          <StatTile icon={Clock} label={t.dashboard.avgPerWorkday} value={formatHoursShort(overview.avgPerWorkdayMinutes)} />
          <StatTile icon={Users} label={t.dashboard.activeWorkers} value={String(activeWorkersCount)} />
          <StatTile icon={Building2} label={t.dashboard.objectsWorked} value={String(overview.objectsWorkedCount)} />
        </div>

        <TodayCard className="mt-4" overview={today} activeWorkersCount={activeWorkersCount} />

        <section className="mt-4 rounded-[16px] border border-border bg-surface p-5">
          <h3 className="text-[17px] font-bold">{t.dashboard.chartTitle}</h3>
          <div className="mt-4">
            <HoursChart data={chartData} emptyLabel={t.dashboard.chartEmpty} />
          </div>
        </section>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TopList title={t.dashboard.topSitesTitle} items={topSites} emptyLabel={t.dashboard.topSitesEmpty} />
          <TopList title={t.dashboard.topWorkersTitle} items={topWorkers} emptyLabel={t.dashboard.topWorkersEmpty} />
        </div>
      </div>
    </div>
  );
}
