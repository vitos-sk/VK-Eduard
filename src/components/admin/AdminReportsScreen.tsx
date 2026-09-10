"use client";

import { useEffect, useMemo, useState } from "react";
import { endOfMonth, startOfMonth } from "date-fns";
import { ImageIcon } from "lucide-react";

import { ExportMenu } from "@/components/admin/ExportMenu";
import { EmptyState } from "@/components/shared/EmptyState";
import { PeriodNavigator } from "@/components/hours/PeriodNavigator";
import {
  SegmentedTabs,
  type SegmentedOption,
} from "@/components/shared/SegmentedTabs";
import { formatTimeShort, formatWorkDateShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { getCompanyEntryHoursInRange } from "@/modules/entries/queries";
import type { Tables } from "@/lib/supabase/types.gen";
import type { Site } from "@/modules/sites/queries";
import type { Worker } from "@/modules/team/queries";
import { dateKeyOf } from "@/modules/time/calc";
import { cn } from "@/lib/utils";

type EntryHoursRow = Tables<"entry_hours">;
type ContentFilter = "all" | "no_description" | "with_photo";

const CONTENT_OPTIONS: readonly SegmentedOption<ContentFilter>[] = [
  { value: "all", label: t.reports.tabs.all },
  { value: "no_description", label: t.reports.tabs.noDescription },
  { value: "with_photo", label: t.reports.tabs.withPhoto },
];

const FILTER_ALL = "all";

interface AdminReportsScreenProps {
  companyId: string;
  sites: readonly Site[];
  workers: readonly Worker[];
}

/**
 * Компанейський огляд звітів для десктоп-адмінки — таблиця з `entry_hours`
 * (та сама вьюха, що й `api/export/route.ts`: вже готові `worked_minutes`/
 * `photo_count`), з фільтрами по робітнику, об'єкту та вмісту.
 */
export function AdminReportsScreen({ companyId, sites, workers }: AdminReportsScreenProps) {
  const supabase = useMemo(() => createClient(), []);

  const [month, setMonth] = useState(() => new Date());
  const [rows, setRows] = useState<readonly EntryHoursRow[]>([]);
  const [workerFilter, setWorkerFilter] = useState(FILTER_ALL);
  const [objectFilter, setObjectFilter] = useState(FILTER_ALL);
  const [contentFilter, setContentFilter] = useState<ContentFilter>("all");

  const from = dateKeyOf(startOfMonth(month));
  const to = dateKeyOf(endOfMonth(month));

  useEffect(() => {
    let cancelled = false;

    getCompanyEntryHoursInRange(supabase, companyId, from, to)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [supabase, companyId, from, to]);

  const siteNameById = useMemo(
    () => new Map(sites.map((site) => [site.id, site.name] as const)),
    [sites],
  );

  const visibleRows = useMemo(
    () =>
      rows.filter((row) => {
        if (workerFilter !== FILTER_ALL && row.author_id !== workerFilter) return false;
        if (objectFilter !== FILTER_ALL && row.site_id !== objectFilter) return false;
        if (contentFilter === "no_description" && row.has_description) return false;
        if (contentFilter === "with_photo" && !row.photo_count) return false;
        return true;
      }),
    [rows, workerFilter, objectFilter, contentFilter],
  );

  const monthTitle = `${t.months.nominative[month.getMonth()]} ${month.getFullYear()}`;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[26px] font-extrabold tracking-tight">{t.admin.reports.title}</h1>
        <ExportMenu from={from} to={to} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <PeriodNavigator
          className="w-[280px]"
          title={monthTitle}
          onPrev={() => setMonth((current) => addMonthsSafe(current, -1))}
          onNext={() => setMonth((current) => addMonthsSafe(current, 1))}
        />

        <select
          value={workerFilter}
          onChange={(event) => setWorkerFilter(event.target.value)}
          className={selectClassName}
        >
          <option value={FILTER_ALL}>{t.admin.reports.filterWorkerAll}</option>
          {workers.map((worker) => (
            <option key={worker.id} value={worker.id}>
              {worker.full_name}
            </option>
          ))}
        </select>

        <select
          value={objectFilter}
          onChange={(event) => setObjectFilter(event.target.value)}
          className={selectClassName}
        >
          <option value={FILTER_ALL}>{t.admin.reports.filterObjectAll}</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </select>

        <SegmentedTabs
          options={CONTENT_OPTIONS}
          value={contentFilter}
          onChange={setContentFilter}
          label={t.reports.title}
          className="mx-0 w-auto px-0"
        />
      </div>

      {visibleRows.length === 0 ? (
        <EmptyState className="mt-6" title={t.admin.reports.empty} />
      ) : (
        <div className="mt-5 overflow-x-auto rounded-[16px] border border-border bg-surface">
          <table className="w-full min-w-[820px] border-collapse text-left text-[14px]">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="px-4 py-3 font-medium">{t.admin.reports.columnWorker}</th>
                <th className="px-4 py-3 font-medium">{t.admin.reports.columnDate}</th>
                <th className="px-4 py-3 font-medium">{t.admin.reports.columnTime}</th>
                <th className="px-4 py-3 font-medium">{t.admin.reports.columnObject}</th>
                <th className="px-4 py-3 font-medium">{t.admin.reports.columnDescription}</th>
                <th className="px-4 py-3 text-right font-medium">
                  {t.admin.reports.columnPhotos}
                </th>
              </tr>
            </thead>

            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-b-0">
                  <td className="max-w-[160px] truncate px-4 py-3 font-bold">
                    {row.full_name}
                  </td>
                  <td className="tabular px-4 py-3 text-text-muted">
                    {row.work_date ? formatWorkDateShort(row.work_date) : t.common.dash}
                  </td>
                  <td className="tabular px-4 py-3 text-text-muted">
                    {row.started_at ? formatTimeShort(row.started_at) : t.common.dash}–
                    {row.ended_at ? formatTimeShort(row.ended_at) : t.hours.entryOngoing}
                  </td>
                  <td className="max-w-[140px] truncate px-4 py-3">
                    {(row.site_id && siteNameById.get(row.site_id)) || t.hours.noObject}
                  </td>
                  <td className="max-w-[260px] truncate px-4 py-3 text-text-muted">
                    {row.description || t.reports.noDescriptionBadge}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.photo_count ? (
                      <span className="inline-flex items-center justify-end gap-1 tabular">
                        {row.photo_count}
                        <ImageIcon className="size-[14px] text-text-muted" strokeWidth={2} aria-hidden />
                      </span>
                    ) : (
                      t.common.dash
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const selectClassName = cn(
  "h-11 rounded-[12px] border border-border bg-surface px-3",
  "text-[14px] font-semibold text-text outline-none",
  "focus-visible:border-brand",
);

function addMonthsSafe(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}
