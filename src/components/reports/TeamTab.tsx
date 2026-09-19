"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { uk as ukLocale } from "date-fns/locale";
import { Camera, ChevronLeft, ChevronRight, Clock, FileText, Gauge, Search, Users } from "lucide-react";
import { toast } from "sonner";

import { CompanyReportCard } from "@/components/reports/CompanyReportCard";
import { ExportMenu } from "@/components/reports/ExportMenu";
import { ReportsFeed } from "@/components/reports/ReportsFeed";
import { ShareWhatsAppButton } from "@/components/reports/ShareWhatsAppButton";
import { TeamKpiStrip } from "@/components/reports/TeamKpiStrip";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SegmentedTabs,
  type SegmentedOption,
} from "@/components/shared/SegmentedTabs";
import { PeriodNavigator } from "@/components/hours/PeriodNavigator";
import { fmt, formatHoursShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import { reportsStrings as s } from "@/lib/i18n/parts/reports";
import { createClient } from "@/lib/supabase/client";
import { getCompanyEntriesInRange } from "@/modules/entries/queries";
import type { WorkEntryWithNames } from "@/modules/entries/types";
import { getSignedPhotoUrls } from "@/modules/media/signedUrls";
import { getCompanyReportsInRange, getReportsFeed } from "@/modules/reports/queries";
import type { SiteReportWithNames, SiteReportWithPhotos, WorkCategory } from "@/modules/reports/types";
import type { Site } from "@/modules/sites/queries";
import { getCompanyWorkers, type Worker } from "@/modules/team/queries";
import { dateKeyOf } from "@/modules/time/calc";
import { cn } from "@/lib/utils";

const SITE_FILTER_ALL = "all";

function sumMinutesByAuthor(
  entries: readonly WorkEntryWithNames[],
): ReadonlyMap<string, number> {
  const map = new Map<string, number>();

  for (const entry of entries) {
    map.set(entry.author_id, (map.get(entry.author_id) ?? 0) + (entry.total_minutes ?? 0));
  }

  return map;
}

interface TeamTabProps {
  companyId: string;
  sites: readonly Site[];
  categories: readonly WorkCategory[];
}

/**
 * Вкладка «Команда» (REPORTS.md, розділ 4) — тільки boss. Список
 * працівників компанії з їхніми годинами за обраний місяць (джерело —
 * `work_entries`, «Години» цю вкладку не чіпаємо), фільтр по одному
 * працівнику, перехід у стрічку його звітів (вже з `site_reports`) і
 * кнопки експорту CSV.
 *
 * Хто саме бачить цю вкладку — вирішує `ReportsScreen` (перевіряє
 * `profile.role`), тут це вже не перевіряється повторно.
 */
export function TeamTab({ companyId, sites, categories }: TeamTabProps) {
  const supabase = useMemo(() => createClient(), []);

  const [workers, setWorkers] = useState<readonly Worker[]>([]);
  const [month, setMonth] = useState(() => new Date());
  const [monthMinutes, setMonthMinutes] = useState<ReadonlyMap<string, number>>(new Map());
  const [weekMinutes, setWeekMinutes] = useState<ReadonlyMap<string, number>>(new Map());
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [companyReports, setCompanyReports] = useState<readonly SiteReportWithNames[]>([]);
  const [loadedFeedKey, setLoadedFeedKey] = useState<string | null>(null);
  const feedKey = dateKeyOf(startOfMonth(month));
  const isFeedLoading = loadedFeedKey !== feedKey;
  const [siteFilter, setSiteFilter] = useState(SITE_FILTER_ALL);

  const [openWorkerId, setOpenWorkerId] = useState<string | null>(null);
  const [openReports, setOpenReports] = useState<readonly SiteReportWithPhotos[]>([]);
  const [openThumbUrls, setOpenThumbUrls] = useState<Readonly<Record<string, string>>>({});
  const [isOpenLoading, setIsOpenLoading] = useState(false);

  const refreshWorkers = useCallback(() => {
    getCompanyWorkers(supabase, companyId)
      .then((data) => setWorkers(data))
      .catch(() => {});
  }, [supabase, companyId]);

  useEffect(() => {
    refreshWorkers();
  }, [refreshWorkers]);

  useEffect(() => {
    let cancelled = false;
    const monthFrom = dateKeyOf(startOfMonth(month));
    const monthTo = dateKeyOf(endOfMonth(month));
    const weekFrom = dateKeyOf(startOfWeek(new Date(), { locale: ukLocale }));
    const weekTo = dateKeyOf(endOfWeek(new Date(), { locale: ukLocale }));

    Promise.all([
      getCompanyEntriesInRange(supabase, companyId, monthFrom, monthTo),
      getCompanyEntriesInRange(supabase, companyId, weekFrom, weekTo),
    ])
      .then(([monthEntries, weekEntries]) => {
        if (cancelled) return;
        setMonthMinutes(sumMinutesByAuthor(monthEntries));
        setWeekMinutes(sumMinutesByAuthor(weekEntries));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [supabase, companyId, month]);

  useEffect(() => {
    let cancelled = false;

    getCompanyReportsInRange(
      supabase,
      companyId,
      dateKeyOf(startOfMonth(month)),
      dateKeyOf(endOfMonth(month)),
    )
      .then((data) => {
        if (cancelled) return;
        setCompanyReports(data);
        setLoadedFeedKey(dateKeyOf(startOfMonth(month)));
      })
      .catch(() => {
        if (cancelled) return;
        toast(s.feed.loadError);
        setLoadedFeedKey(dateKeyOf(startOfMonth(month)));
      });

    return () => {
      cancelled = true;
    };
  }, [supabase, companyId, month]);

  const allRows = useMemo(
    () =>
      workers
        .map((worker) => ({
          worker,
          monthMinutes: monthMinutes.get(worker.id) ?? 0,
          weekMinutes: weekMinutes.get(worker.id) ?? 0,
        }))
        .sort((a, b) => b.monthMinutes - a.monthMinutes),
    [workers, monthMinutes, weekMinutes],
  );

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return allRows;
    return allRows.filter(({ worker }) => worker.full_name.toLowerCase().includes(query));
  }, [allRows, search]);

  const effectiveRows = selectedIds.size > 0
    ? allRows.filter(({ worker }) => selectedIds.has(worker.id))
    : rows;
  const totalMinutes = effectiveRows.reduce((sum, row) => sum + row.monthMinutes, 0);
  const avgMinutes = effectiveRows.length === 0 ? 0 : Math.round(totalMinutes / effectiveRows.length);

  const allVisibleSelected =
    rows.length > 0 && rows.every(({ worker }) => selectedIds.has(worker.id));

  const toggleWorker = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const { worker } of rows) {
        if (allVisibleSelected) next.delete(worker.id);
        else next.add(worker.id);
      }
      return next;
    });
  };

  const exportWorkerIds =
    selectedIds.size > 0
      ? [...selectedIds]
      : search.trim().length > 0
        ? rows.map(({ worker }) => worker.id)
        : undefined;

  const siteOptions: readonly SegmentedOption<string>[] = useMemo(
    () => [
      { value: SITE_FILTER_ALL, label: s.feed.filterSiteAll },
      ...sites.map((site) => ({ value: site.id, label: site.name })),
    ],
    [sites],
  );

  const feedReports = useMemo(
    () =>
      companyReports.filter((report) => {
        if (selectedIds.size > 0 && !selectedIds.has(report.author_id)) return false;
        if (siteFilter !== SITE_FILTER_ALL && report.site_id !== siteFilter) return false;
        return true;
      }),
    [companyReports, selectedIds, siteFilter],
  );
  const photosTotal = feedReports.reduce((sum, report) => sum + report.photo_count, 0);
  const hasFeedFilters = selectedIds.size > 0 || siteFilter !== SITE_FILTER_ALL;

  const handleReportDeleted = (reportId: string) => {
    setCompanyReports((current) => current.filter((report) => report.id !== reportId));
  };

  const openWorker = (workerId: string) => {
    setOpenWorkerId(workerId);
    setIsOpenLoading(true);

    getReportsFeed(supabase, workerId)
      .then(async (reports) => {
        const paths = reports
          .map((report) => report.report_photos[0]?.storage_path)
          .filter((path): path is string => Boolean(path));
        const urls = await getSignedPhotoUrls(supabase, paths);

        setOpenReports(reports);
        setOpenThumbUrls(Object.fromEntries(urls));
      })
      .finally(() => setIsOpenLoading(false));
  };

  const monthFrom = dateKeyOf(startOfMonth(month));
  const monthTo = dateKeyOf(endOfMonth(month));

  if (openWorkerId) {
    const worker = workers.find((item) => item.id === openWorkerId);

    return (
      <div>
        <div className="flex items-start justify-between gap-3 px-4 pb-1">
          <div>
            <button
              type="button"
              onClick={() => setOpenWorkerId(null)}
              className="flex items-center gap-1 py-3 text-[15px] font-bold text-text-muted active:text-text"
            >
              <ChevronLeft className="size-5" strokeWidth={2.4} aria-hidden />
              {t.reports.team.back}
            </button>

            <p className="text-[22px] font-extrabold tracking-tight">
              {worker?.full_name}
            </p>
          </div>

          <div className="mt-3 flex gap-2">
            <ExportMenu from={monthFrom} to={monthTo} workerId={openWorkerId} />
            <ExportMenu kind="reports" from={monthFrom} to={monthTo} workerId={openWorkerId} />
          </div>
        </div>

        {isOpenLoading ? null : (
          <ReportsFeed reports={openReports} sites={sites} categories={categories} thumbUrls={openThumbUrls} />
        )}
      </div>
    );
  }

  const monthTitle = `${t.months.nominative[month.getMonth()]} ${month.getFullYear()}`;

  return (
    <div className="px-4 pb-2">
      <PeriodNavigator
        title={monthTitle}
        onPrev={() => setMonth((current) => addMonthsSafe(current, -1))}
        onNext={() => setMonth((current) => addMonthsSafe(current, 1))}
      />

      <TeamKpiStrip
        cells={[
          { icon: Clock, label: s.team.kpiHours, value: formatHoursShort(totalMinutes), muted: totalMinutes === 0 },
          { icon: Users, label: s.team.kpiActive, value: String(effectiveRows.length), muted: effectiveRows.length === 0 },
          { icon: Gauge, label: s.team.kpiAvg, value: formatHoursShort(avgMinutes), muted: avgMinutes === 0 },
        ]}
      />

      <div className="mt-4 flex items-center gap-2">
        <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[12px] border border-border bg-surface-2 px-3">
          <Search className="size-4 shrink-0 text-text-dim" strokeWidth={2} aria-hidden />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={s.team.searchPlaceholder}
            aria-label={s.team.searchPlaceholder}
            className="w-full bg-transparent text-[14px] font-medium outline-none placeholder:text-text-dim"
          />
        </div>

        <button
          type="button"
          onClick={toggleSelectAll}
          className="h-11 shrink-0 rounded-[12px] border border-border px-4 text-[14px] font-bold text-text"
        >
          {allVisibleSelected ? s.team.deselectAll : s.team.selectAll}
        </button>
      </div>

      {rows.length === 0 ? (
        <EmptyState className="mt-6" title={t.reports.team.empty} />
      ) : (
        <ul className="mt-3 space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
          {rows.map(({ worker, monthMinutes: workerMonthMinutes, weekMinutes: workerWeekMinutes }) => {
            const isChecked = selectedIds.has(worker.id);

            return (
              <li
                key={worker.id}
                className={cn(
                  "flex items-stretch rounded-[16px] border transition-colors duration-150",
                  isChecked ? "border-brand bg-brand/10" : "border-border bg-surface",
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleWorker(worker.id)}
                  aria-pressed={isChecked}
                  className="flex min-w-0 flex-1 items-center gap-3 p-4 text-left"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-[6px] border-2",
                      isChecked ? "border-brand bg-brand" : "border-text-dim",
                    )}
                  >
                    {isChecked && (
                      <svg viewBox="0 0 16 16" className="size-3 text-brand-ink" fill="none">
                        <path
                          d="M3 8.5 6.5 12 13 4.5"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-[16px] font-bold">{worker.full_name}</span>
                      <span className="tabular shrink-0 text-[16px] font-bold">
                        {formatHoursShort(workerMonthMinutes)}
                      </span>
                    </span>
                    <span className="mt-1 block text-[13px] font-medium text-text-muted">
                      {fmt(t.reports.team.thisWeek, { hours: formatHoursShort(workerWeekMinutes) })}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => openWorker(worker.id)}
                  aria-label={`${s.team.openWorker}: ${worker.full_name}`}
                  className="flex w-12 shrink-0 items-center justify-center rounded-r-[16px] border-l border-border text-text-muted active:text-text"
                >
                  <ChevronRight className="size-5" strokeWidth={2.2} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="mt-8 text-[18px] font-extrabold tracking-tight">{s.team.reportsTitle}</h2>

      <TeamKpiStrip
        cells={[
          { icon: FileText, label: s.feed.kpiReports, value: String(feedReports.length), muted: feedReports.length === 0 },
          { icon: Camera, label: s.feed.kpiPhotos, value: String(photosTotal), muted: photosTotal === 0 },
        ]}
      />

      {sites.length > 0 && (
        <SegmentedTabs
          className="mt-3"
          size="sm"
          label={s.feed.filterSiteLabel}
          options={siteOptions}
          value={siteFilter}
          onChange={setSiteFilter}
        />
      )}

      {isFeedLoading ? (
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-[140px] rounded-[12px]" />
          ))}
        </div>
      ) : feedReports.length === 0 ? (
        <EmptyState
          className="mt-4"
          title={hasFeedFilters ? s.feed.emptyFilteredTitle : s.feed.emptyTitle}
          description={hasFeedFilters ? s.feed.emptyFilteredHint : undefined}
        />
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {feedReports.map((report) => (
            <CompanyReportCard key={report.id} report={report} onDeleted={handleReportDeleted} />
          ))}
        </div>
      )}

      <div className="sticky bottom-4 z-10 mt-6 flex flex-wrap items-center gap-2 rounded-[16px] border border-border bg-surface p-3 shadow-lg">
        <p className="min-w-0 flex-1 truncate text-[13px] font-bold text-text-muted">
          {selectedIds.size > 0 ? fmt(s.team.selected, { n: selectedIds.size }) : s.team.selectedAll}
        </p>

        <ExportMenu from={monthFrom} to={monthTo} workerIds={exportWorkerIds} />
        <ExportMenu kind="reports" from={monthFrom} to={monthTo} workerIds={exportWorkerIds} />
        <ShareWhatsAppButton from={monthFrom} to={monthTo} workerIds={exportWorkerIds} />
      </div>
    </div>
  );
}

function addMonthsSafe(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}
