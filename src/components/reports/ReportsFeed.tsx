"use client";

import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/shared/EmptyState";
import { ReportCard } from "@/components/shared/ReportCard";
import { SearchField } from "@/components/shared/SearchField";
import {
  SegmentedTabs,
  type SegmentedOption,
} from "@/components/shared/SegmentedTabs";
import { fmt, formatDayMonth, formatHoursShort, fromDateKey } from "@/lib/format";
import { t } from "@/lib/i18n";
import { reportState } from "@/modules/entries/reportState";
import type { WorkEntryWithPhotos } from "@/modules/entries/types";
import type { Site } from "@/modules/sites/queries";
import { dateKeyOf, sumTotalMinutes } from "@/modules/time/calc";

type ReportFilter = "all" | "no_description" | "with_photo";

const FILTER_OPTIONS: readonly SegmentedOption<ReportFilter>[] = [
  { value: "all", label: t.reports.tabs.all },
  { value: "no_description", label: t.reports.tabs.noDescription },
  { value: "with_photo", label: t.reports.tabs.withPhoto },
];

interface DateGroup {
  date: string;
  title: string;
  entries: WorkEntryWithPhotos[];
}

function groupTitle(date: string, todayKey: string, yesterdayKey: string): string {
  if (date === todayKey) return t.reports.today;
  if (date === yesterdayKey) return t.reports.yesterday;
  return formatDayMonth(fromDateKey(date));
}

interface ReportsFeedProps {
  entries: readonly WorkEntryWithPhotos[];
  sites: readonly Site[];
  thumbUrls: Readonly<Record<string, string>>;
}

/**
 * Лента звітів: фільтр по вмісту (не по статусу — REPORTS.md, розділ 2),
 * пошук, групування по датах, зведення годин по видимій вибірці.
 *
 * Винесена з `ReportsScreen`, щоб той самий список можна було показати
 * і на вкладці «Мої», і на вкладці «Команда» для одного обраного
 * співробітника (`TeamTab`) — без дублювання розмітки й логіки фільтрів.
 */
export function ReportsFeed({ entries, sites, thumbUrls }: ReportsFeedProps) {
  const [filter, setFilter] = useState<ReportFilter>("all");
  const [query, setQuery] = useState("");
  // Раз в минуту достаточно: секунды тут никто не считает, только «з HH:mm».
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const siteNameById = useMemo(
    () => new Map(sites.map((site) => [site.id, site.name] as const)),
    [sites],
  );

  const todayKey = dateKeyOf(now);
  const yesterdayKey = dateKeyOf(new Date(now.getTime() - 24 * 60 * 60 * 1000));

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("uk");

    return entries.filter((entry) => {
      const state = reportState(entry, entry.entry_photos.length);

      if (filter === "no_description" && state !== "no_description") return false;
      if (filter === "with_photo" && entry.entry_photos.length === 0) return false;

      if (!needle) return true;

      const siteName = entry.site_id ? (siteNameById.get(entry.site_id) ?? "") : "";
      const haystack = `${siteName} ${entry.description}`.toLocaleLowerCase("uk");

      return haystack.includes(needle);
    });
  }, [entries, filter, query, siteNameById]);

  const groups = useMemo<DateGroup[]>(() => {
    const byDate = new Map<string, WorkEntryWithPhotos[]>();

    for (const entry of visible) {
      const bucket = byDate.get(entry.work_date);
      if (bucket) bucket.push(entry);
      else byDate.set(entry.work_date, [entry]);
    }

    return [...byDate.entries()]
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([date, items]) => ({
        date,
        title: groupTitle(date, todayKey, yesterdayKey),
        entries: items,
      }));
  }, [visible, todayKey, yesterdayKey]);

  const visibleMinutes = sumTotalMinutes(visible);

  const emptyTitle =
    filter === "no_description"
      ? t.reports.emptyNoDescriptionTitle
      : entries.length === 0
        ? t.reports.emptyTitle
        : t.reports.emptyFilterTitle;

  const emptyHint =
    filter === "no_description"
      ? undefined
      : entries.length === 0
        ? t.reports.emptyHint
        : t.reports.emptyFilterHint;

  return (
    <div className="px-4">
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder={t.reports.searchPlaceholder}
      />

      <SegmentedTabs
        className="mt-3"
        options={FILTER_OPTIONS}
        value={filter}
        onChange={setFilter}
        label={t.reports.title}
      />

      {visible.length > 0 && (
        <div className="mt-4 flex items-baseline justify-between rounded-[16px] border border-border bg-surface px-4 py-3">
          <p className="text-[13px] font-medium text-text-muted">
            {t.reports.periodSummary}
          </p>
          <p className="tabular text-[15px] font-bold">
            {formatHoursShort(visibleMinutes)}
          </p>
        </div>
      )}

      {groups.length > 0 ? (
        groups.map((group) => (
          <section key={group.date} className="mt-6 first:mt-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="min-w-0 truncate text-[20px] font-bold">
                {group.title}
              </h2>
              <span className="shrink-0 text-[13px] font-medium text-text-muted">
                {fmt(t.reports.reportsCount, { n: group.entries.length })}
              </span>
            </div>

            <div className="mt-3 space-y-3">
              {group.entries.map((entry) => (
                <ReportCard
                  key={entry.id}
                  entry={entry}
                  siteName={entry.site_id ? (siteNameById.get(entry.site_id) ?? null) : null}
                  thumbUrl={
                    entry.entry_photos[0]
                      ? (thumbUrls[entry.entry_photos[0].storage_path] ?? null)
                      : null
                  }
                  now={now}
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
