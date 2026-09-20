"use client";

import { useMemo, useState } from "react";

import { EmptyState } from "@/components/shared/EmptyState";
import { ReportCard } from "@/components/shared/ReportCard";
import { SearchField } from "@/components/shared/SearchField";
import {
  SegmentedTabs,
  type SegmentedOption,
} from "@/components/shared/SegmentedTabs";
import { fmt, formatDayMonth, fromDateKey } from "@/lib/format";
import { t } from "@/lib/i18n";
import { aggregateCategoryStats } from "@/modules/reports/categoryStats";
import { reportState } from "@/modules/reports/reportState";
import type { SiteReportWithPhotos, WorkCategory } from "@/modules/reports/types";
import type { Site } from "@/modules/sites/queries";
import { dateKeyOf } from "@/modules/time/calc";
import { Card } from "@/components/ui/card";

type ReportFilter = "all" | "no_description" | "with_photo";

const FILTER_OPTIONS: readonly SegmentedOption<ReportFilter>[] = [
  { value: "all", label: t.reports.tabs.all },
  { value: "no_description", label: t.reports.tabs.noDescription },
  { value: "with_photo", label: t.reports.tabs.withPhoto },
];

interface DateGroup {
  date: string;
  title: string;
  reports: SiteReportWithPhotos[];
}

function groupTitle(date: string, todayKey: string, yesterdayKey: string): string {
  if (date === todayKey) return t.reports.today;
  if (date === yesterdayKey) return t.reports.yesterday;
  return formatDayMonth(fromDateKey(date));
}

interface ReportsFeedProps {
  reports: readonly SiteReportWithPhotos[];
  sites: readonly Site[];
  categories: readonly WorkCategory[];
  thumbUrls: Readonly<Record<string, string>>;
}

/**
 * Лента звітів: фільтр по вмісту (не по статусу — REPORTS.md, розділ 2),
 * пошук, групування по датах, зведення по видимій вибірці — кількість
 * звітів і домінуюча категорія (замінили колишню суму годин, якої у звіту
 * більше немає).
 *
 * Винесена з `ReportsScreen`, щоб той самий список можна було показати
 * і на вкладці «Мої», і на вкладці «Команда» для одного обраного
 * співробітника (`TeamTab`) — без дублювання розмітки й логіки фільтрів.
 */
export function ReportsFeed({ reports, sites, categories, thumbUrls }: ReportsFeedProps) {
  const [filter, setFilter] = useState<ReportFilter>("all");
  const [query, setQuery] = useState("");

  const siteNameById = useMemo(
    () => new Map(sites.map((site) => [site.id, site.name] as const)),
    [sites],
  );

  const now = new Date();
  const todayKey = dateKeyOf(now);
  const yesterdayKey = dateKeyOf(new Date(now.getTime() - 24 * 60 * 60 * 1000));

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("uk");

    return reports.filter((report) => {
      const state = reportState(report, report.report_photos.length);

      if (filter === "no_description" && state !== "no_description") return false;
      if (filter === "with_photo" && report.report_photos.length === 0) return false;

      if (!needle) return true;

      const siteName = report.site_id ? (siteNameById.get(report.site_id) ?? "") : "";
      const haystack = `${siteName} ${report.description}`.toLocaleLowerCase("uk");

      return haystack.includes(needle);
    });
  }, [reports, filter, query, siteNameById]);

  const groups = useMemo<DateGroup[]>(() => {
    const byDate = new Map<string, SiteReportWithPhotos[]>();

    for (const report of visible) {
      const bucket = byDate.get(report.work_date);
      if (bucket) bucket.push(report);
      else byDate.set(report.work_date, [report]);
    }

    return [...byDate.entries()]
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([date, items]) => ({
        date,
        title: groupTitle(date, todayKey, yesterdayKey),
        reports: items,
      }));
  }, [visible, todayKey, yesterdayKey]);

  const dominantCategory = aggregateCategoryStats(visible, categories)[0] ?? null;

  const emptyTitle =
    filter === "no_description"
      ? t.reports.emptyNoDescriptionTitle
      : reports.length === 0
        ? t.reports.emptyTitle
        : t.reports.emptyFilterTitle;

  const emptyHint =
    filter === "no_description"
      ? undefined
      : reports.length === 0
        ? t.reports.emptyHint
        : t.reports.emptyFilterHint;

  return (
    <div className="px-4">
      <div className="lg:flex lg:items-center lg:gap-4">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder={t.reports.searchPlaceholder}
          className="lg:flex-1"
        />

        <SegmentedTabs
          className="mt-3 lg:mt-0 lg:shrink-0"
          options={FILTER_OPTIONS}
          value={filter}
          onChange={setFilter}
          label={t.reports.title}
        />
      </div>

      {visible.length > 0 && (
        <Card padding="none" className="mt-4 flex items-baseline justify-between px-4 py-3">
          <p className="text-[13px] font-medium text-text-muted">
            {fmt(t.reports.reportsSummaryCount, { n: visible.length })}
          </p>
          {dominantCategory && (
            <p className="text-[13px] font-bold text-text-muted">
              {fmt(t.reports.reportsSummaryDominant, { label: dominantCategory.label })}
            </p>
          )}
        </Card>
      )}

      {groups.length > 0 ? (
        groups.map((group) => (
          <section key={group.date} className="mt-6 first:mt-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="min-w-0 truncate text-[20px] font-bold">
                {group.title}
              </h2>
              <span className="shrink-0 text-[13px] font-medium text-text-muted">
                {fmt(t.reports.reportsCount, { n: group.reports.length })}
              </span>
            </div>

            <div className="mt-3 space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
              {group.reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  siteName={report.site_id ? (siteNameById.get(report.site_id) ?? null) : null}
                  categories={categories}
                  thumbUrl={
                    report.report_photos[0]
                      ? (thumbUrls[report.report_photos[0].storage_path] ?? null)
                      : null
                  }
                />
              ))}
            </div>
          </section>
        ))
      ) : (
        <EmptyState className="mt-6" title={emptyTitle} description={emptyHint} />
      )}
    </div>
  );
}
