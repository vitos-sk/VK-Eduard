// src/components/dashboard/DashboardScreen.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  eachDayOfInterval,
  getQuarter,
  isSameDay,
  startOfWeek,
} from "date-fns";
import { Building2, Clock, FileQuestion, Users } from "lucide-react";

import { TodayCard } from "@/components/dashboard/TodayCard";
import { TopList } from "@/components/dashboard/TopList";
import { AvatarLink } from "@/components/layout/AvatarLink";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { SegmentedTabs } from "@/components/shared/SegmentedTabs";
import { initialsOf } from "@/components/shared/Thumb";
import { ChartBars, type ChartBar } from "@/components/ui/chart-bars";
import { KpiTicket } from "@/components/ui/kpi-ticket";
import { Ticket } from "@/components/ui/ticket";
import {
  TicketTable,
  TicketTableCell,
  TicketTableHead,
  TicketTableHeader,
  TicketTableRow,
} from "@/components/ui/ticket-table";
import { fmt, formatHoursShort } from "@/lib/format";
import type { Dict } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/modules/auth/profile";
import {
  buildOverview,
  buildTodayOverview,
  buildTopSites,
  buildWorkerPeriodRows,
} from "@/modules/dashboard/aggregate";
import { buildHoursChartData, getPeriodRange, type DashboardPeriod } from "@/modules/dashboard/period";
import { getCompanyEntriesInRange } from "@/modules/entries/queries";
import type { WorkEntryWithNames } from "@/modules/entries/types";
import { dateKeyOf } from "@/modules/time/calc";

interface DashboardScreenProps {
  profile: Profile;
  initialPeriodEntries: readonly WorkEntryWithNames[];
  todayEntries: readonly WorkEntryWithNames[];
  workers: readonly { id: string; name: string }[];
}

const ROMAN_QUARTERS = ["I", "II", "III", "IV"] as const;

/** Подпись периода: «Жовтень 2026», «IV квартал 2026», «2026». */
function periodTitle(period: DashboardPeriod, date: Date, t: Dict): string {
  if (period === "year") return String(date.getFullYear());
  if (period === "quarter") {
    return fmt(t.dashboard.quarterLabel, {
      q: ROMAN_QUARTERS[getQuarter(date) - 1],
      year: date.getFullYear(),
    });
  }

  return `${t.months.nominative[date.getMonth()]} ${date.getFullYear()}`;
}

/** Период в предложении-итоге: «жовтень» / «IV квартал» / «рік». */
function periodInSentence(period: DashboardPeriod, date: Date, t: Dict): string {
  if (period === "year") return String(date.getFullYear());
  if (period === "quarter") return `${ROMAN_QUARTERS[getQuarter(date) - 1]} ${t.dashboard.periodQuarter.toLowerCase()}`;

  return t.months.nominative[date.getMonth()].toLowerCase();
}

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
  workers,
}: DashboardScreenProps) {
  const t = useT();
  const PERIOD_OPTIONS: readonly { value: DashboardPeriod; label: string }[] = [
    { value: "month", label: t.dashboard.periodMonth },
    { value: "quarter", label: t.dashboard.periodQuarter },
    { value: "year", label: t.dashboard.periodYear },
  ];
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
  const chartData = useMemo(
    () => buildHoursChartData(period, referenceDate, periodEntries, t),
    [period, referenceDate, periodEntries, t],
  );
  const range = useMemo(() => getPeriodRange(period, referenceDate), [period, referenceDate]);
  const workerRows = useMemo(
    () =>
      buildWorkerPeriodRows(
        periodEntries,
        workers,
        dateKeyOf(range.from),
        dateKeyOf(range.to),
        dateKeyOf(referenceDate),
      ),
    [periodEntries, workers, range, referenceDate],
  );
  const isWorkday = referenceDate.getDay() !== 0 && referenceDate.getDay() !== 6;
  const today = useMemo(() => buildTodayOverview(todayEntries, workers), [todayEntries, workers]);

  // Столбцы графика: месяц — рабочие дни до сегодня («8 чт»), квартал и год — как корзины.
  const bars = useMemo<ChartBar[]>(() => {
    if (period === "month") {
      const lastDay = referenceDate < range.to ? referenceDate : range.to;

      return eachDayOfInterval({ start: range.from, end: lastDay })
        .filter((day) => day.getDay() !== 0 && day.getDay() !== 6)
        .map((day) => ({
          key: dateKeyOf(day),
          label: `${day.getDate()} ${t.weekdays.short[day.getDay()].toLowerCase()}`,
          value: chartData[day.getDate() - 1]?.minutes ?? 0,
          current: isSameDay(day, referenceDate),
        }));
    }

    const currentLabel =
      period === "year"
        ? t.months.nominative[referenceDate.getMonth()].slice(0, 3)
        : (() => {
            const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
            return `${String(weekStart.getDate()).padStart(2, "0")}.${String(weekStart.getMonth() + 1).padStart(2, "0")}`;
          })();

    return chartData.map((point, index) => ({
      key: `${index}-${point.label}`,
      label: point.label,
      value: point.minutes,
      current: point.label === currentLabel,
    }));
  }, [period, chartData, range, referenceDate, t]);

  const dayCells = bars.filter((bar) => bar.value > 0);
  const hasData = bars.some((bar) => bar.value > 0);
  const noEntryNames = today.withoutEntries.map((worker) => worker.name).join(", ");
  const totalWorkerMinutes = workerRows.reduce((sum, row) => sum + row.minutes, 0);

  return (
    <div className="pb-6">
      <ScreenHeader
        title={t.dashboard.title}
        action={<AvatarLink initials={initialsOf(profile.full_name)} className="lg:hidden" />}
      />

      <div className="px-4 lg:px-0">
        <p className="text-[16px] leading-snug font-semibold lg:text-[20px]">
          {fmt(t.dashboard.summaryBefore, { period: periodInSentence(period, referenceDate, t) })}{" "}
          <mark className="tabular rounded-xs bg-yellow px-1 text-ink">
            {formatHoursShort(overview.totalMinutes)}
          </mark>{" "}
          {t.dashboard.summaryAfter}
          {isWorkday && noEntryNames && (
            <> {fmt(t.dashboard.summaryNoEntries, { names: noEntryNames })}</>
          )}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <SegmentedTabs
            label={t.dashboard.title}
            options={PERIOD_OPTIONS}
            value={period}
            onChange={setPeriod}
            className="w-full lg:w-[260px]"
          />
          <span className="text-[13px] text-ink-2">{periodTitle(period, referenceDate, t)}</span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiTicket
            icon={Clock}
            label={t.dashboard.totalHours}
            value={formatHoursShort(overview.totalMinutes)}
          />
          <KpiTicket
            icon={Users}
            label={t.dashboard.workersWorked}
            value={fmt(t.dashboard.workersWorkedValue, {
              n: overview.workersCount,
              total: workers.length,
            })}
          />
          <KpiTicket
            icon={Building2}
            label={t.dashboard.objectsWorked}
            value={String(overview.objectsWorkedCount)}
          />
          <KpiTicket
            icon={FileQuestion}
            tone="warn"
            label={t.dashboard.noSiteHours}
            value={formatHoursShort(overview.noSiteMinutes)}
          />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-3">
            <Ticket asChild variant="flat">
              <section>
                <h3 className="text-[15px] font-semibold">{t.dashboard.topWorkersTitle}</h3>

                {workerRows.length === 0 ? (
                  <p className="mt-2 text-[14px] text-ink-2">{t.dashboard.topWorkersEmpty}</p>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <TicketTable>
                      <TicketTableHeader>
                        <tr>
                          <TicketTableHead>{t.dashboard.workerColumn}</TicketTableHead>
                          <TicketTableHead numeric>{t.dashboard.hoursColumn}</TicketTableHead>
                          <TicketTableHead numeric>{t.dashboard.daysColumn}</TicketTableHead>
                          <TicketTableHead numeric>{t.dashboard.missingColumn}</TicketTableHead>
                        </tr>
                      </TicketTableHeader>
                      <tbody>
                        {workerRows.map((row) => (
                          <TicketTableRow key={row.id}>
                            <TicketTableCell className="font-medium">{row.name}</TicketTableCell>
                            <TicketTableCell numeric>{formatHoursShort(row.minutes)}</TicketTableCell>
                            <TicketTableCell numeric>{row.daysWithEntries}</TicketTableCell>
                            <TicketTableCell
                              numeric
                              className={row.daysWithoutEntries > 0 ? "text-warn" : undefined}
                            >
                              {row.daysWithoutEntries}
                            </TicketTableCell>
                          </TicketTableRow>
                        ))}
                        <TicketTableRow total>
                          <TicketTableCell>{t.dashboard.total}</TicketTableCell>
                          <TicketTableCell numeric>{formatHoursShort(totalWorkerMinutes)}</TicketTableCell>
                          <TicketTableCell />
                          <TicketTableCell />
                        </TicketTableRow>
                      </tbody>
                    </TicketTable>
                  </div>
                )}
              </section>
            </Ticket>

            <Ticket asChild variant="flat">
              <section>
                <h3 className="text-[15px] font-semibold">{t.dashboard.chartTitle}</h3>
                <div className="mt-3 h-[220px]">
                  {hasData ? (
                    <ChartBars bars={bars} ariaLabel={t.dashboard.chartTitle} />
                  ) : (
                    <p className="flex h-full items-center justify-center text-[14px] text-ink-2">
                      {t.dashboard.chartEmpty}
                    </p>
                  )}
                </div>
              </section>
            </Ticket>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <TodayCard overview={today} isWorkday={isWorkday} />

            <TopList
              title={t.dashboard.topSitesTitle}
              items={topSites}
              emptyLabel={t.dashboard.topSitesEmpty}
              footer={
                overview.noSiteMinutes > 0
                  ? `${t.dashboard.noSite}: ${formatHoursShort(overview.noSiteMinutes)}`
                  : undefined
              }
            />

            {dayCells.length > 0 && (
              <Ticket asChild variant="flat">
                <section>
                  <h3 className="text-[15px] font-semibold">{t.dashboard.daysTitle}</h3>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {dayCells.map((cell) => (
                      <li
                        key={cell.key}
                        className="min-w-[64px] flex-1 rounded-md border border-edge bg-ticket px-1 py-1.5 text-center"
                      >
                        <p className="text-[12px] font-medium text-ink-2">{cell.label}</p>
                        <p className="tabular text-[13px]">{formatHoursShort(cell.value)}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              </Ticket>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
