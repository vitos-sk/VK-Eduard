"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { uk as ukLocale } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Search, Share2 } from "lucide-react";
import { toast } from "sonner";

import { CompanyReportCard } from "@/components/reports/CompanyReportCard";
import { ReportsFeed } from "@/components/reports/ReportsFeed";
import { TeamExportSheet } from "@/components/reports/TeamExportSheet";
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
import type { ExportKind } from "@/modules/export/formats";
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

type TeamView = "people" | "reports";

const VIEW_OPTIONS: readonly SegmentedOption<TeamView>[] = [
  { value: "people", label: s.team.viewPeople },
  { value: "reports", label: s.team.viewReports },
];

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
  const [view, setView] = useState<TeamView>("people");
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportKind, setExportKind] = useState<ExportKind>("hours");
  const [exportIds, setExportIds] = useState<string[]>([]);
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

  const toggleSelectMode = () => {
    if (isSelectMode) setSelectedIds(new Set());
    setIsSelectMode((current) => !current);
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

  const monthTitleLabel = `${t.months.nominative[month.getMonth()]} ${month.getFullYear()}`;

  const exportSheet = (
    <TeamExportSheet
      open={isExportOpen}
      onOpenChange={setIsExportOpen}
      from={monthFrom}
      to={monthTo}
      periodLabel={monthTitleLabel}
      workers={workers.map((worker) => ({ id: worker.id, name: worker.full_name }))}
      workerIds={exportIds}
      onWorkerIdsChange={setExportIds}
      kind={exportKind}
      onKindChange={setExportKind}
    />
  );

  const openExport = (kind: ExportKind) => {
    setExportKind(kind);
    setExportIds(openWorkerId ? [openWorkerId] : [...selectedIds]);
    setIsExportOpen(true);
  };

  if (openWorkerId) {
    const worker = workers.find((item) => item.id === openWorkerId);

    return (
      <div>
        <div className="flex items-center justify-between gap-3 px-4 pb-2">
          <button
            type="button"
            onClick={() => setOpenWorkerId(null)}
            className="flex min-w-0 items-center gap-1 py-2 text-left active:opacity-70"
          >
            <ChevronLeft className="size-6 shrink-0" strokeWidth={2.4} aria-hidden />
            <span className="truncate text-[20px] font-extrabold tracking-tight">{worker?.full_name}</span>
          </button>

          <ExportButton onClick={() => openExport("reports")} />
        </div>

        {isOpenLoading ? null : (
          <ReportsFeed reports={openReports} sites={sites} categories={categories} thumbUrls={openThumbUrls} />
        )}
        {exportSheet}
      </div>
    );
  }

  const monthTitle = `${t.months.nominative[month.getMonth()]} ${month.getFullYear()}`;

  return (
    <div className="px-4 pb-2">
      <div className="flex items-center gap-2">
        <PeriodNavigator
          className="min-w-0 flex-1"
          title={monthTitle}
          onPrev={() => setMonth((current) => addMonthsSafe(current, -1))}
          onNext={() => setMonth((current) => addMonthsSafe(current, 1))}
        />
        <ExportButton
          badge={selectedIds.size}
          onClick={() => openExport(view === "reports" ? "reports" : "hours")}
        />
      </div>

      <p className="tabular mt-3 text-[14px] font-semibold text-text-muted">
        {fmt(s.team.summary, {
          hours: formatHoursShort(totalMinutes),
          people: fmt(s.team.peopleCount, { n: effectiveRows.length }),
          avg: formatHoursShort(avgMinutes),
        })}
      </p>

      <SegmentedTabs
        className="mt-3"
        label={t.reports.title}
        options={VIEW_OPTIONS}
        value={view}
        onChange={setView}
      />

      {view === "people" ? (
        <>
          <div className="mt-3 flex items-center gap-2">
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
              onClick={toggleSelectMode}
              aria-pressed={isSelectMode}
              className={cn(
                "h-11 shrink-0 rounded-[12px] border px-4 text-[14px] font-bold transition-colors duration-150",
                isSelectMode ? "border-brand bg-brand text-brand-ink" : "border-border text-text",
              )}
            >
              {isSelectMode ? s.team.selectDone : s.team.select}
            </button>
          </div>

          {isSelectMode && (
            <button
              type="button"
              onClick={toggleSelectAll}
              className="mt-2 h-9 rounded-full border border-border px-3 text-[13px] font-bold text-text-muted"
            >
              {allVisibleSelected ? s.team.deselectAll : s.team.selectAll}
            </button>
          )}

          {rows.length === 0 ? (
            <EmptyState className="mt-6" title={t.reports.team.empty} />
          ) : (
            <ul className="mt-3 space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
              {rows.map(({ worker, monthMinutes: workerMonthMinutes, weekMinutes: workerWeekMinutes }) => {
                const isChecked = selectedIds.has(worker.id);

                return (
                  <li key={worker.id}>
                    <button
                      type="button"
                      onClick={() => (isSelectMode ? toggleWorker(worker.id) : openWorker(worker.id))}
                      aria-pressed={isSelectMode ? isChecked : undefined}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-[16px] border p-4 text-left",
                        "transition-colors duration-150 active:scale-[0.99]",
                        isChecked ? "border-brand bg-brand/10" : "border-border bg-surface",
                      )}
                    >
                      {isSelectMode && (
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
                      )}

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[16px] font-bold">{worker.full_name}</span>
                        <span className="mt-0.5 block text-[13px] font-medium text-text-muted">
                          {fmt(s.team.weekLine, { hours: formatHoursShort(workerWeekMinutes) })}
                        </span>
                      </span>

                      <span className="tabular shrink-0 text-[16px] font-bold">
                        {formatHoursShort(workerMonthMinutes)}
                      </span>

                      {!isSelectMode && (
                        <ChevronRight className="size-5 shrink-0 text-text-dim" strokeWidth={2.2} aria-hidden />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : (
        <>
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

          <p className="tabular mt-3 text-[13px] font-semibold text-text-muted">
            {fmt(s.team.reportsSummary, { reports: feedReports.length, photos: photosTotal })}
          </p>

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
        </>
      )}

      {exportSheet}
    </div>
  );
}

function ExportButton({ onClick, badge = 0 }: { onClick: () => void; badge?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={s.export.open}
      className={cn(
        "relative flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-text",
        "transition-transform duration-150 active:scale-95",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
      )}
    >
      <Share2 className="size-5" strokeWidth={2.2} aria-hidden />
      {badge > 0 && (
        <span className="absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-extrabold text-brand-ink">
          {badge}
        </span>
      )}
    </button>
  );
}

function addMonthsSafe(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}
