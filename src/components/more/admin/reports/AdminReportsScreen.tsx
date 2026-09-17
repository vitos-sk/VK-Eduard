"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { endOfMonth, startOfMonth } from "date-fns";
import { Camera, FileText } from "lucide-react";
import { toast } from "sonner";

import { AdminKpiStrip } from "@/components/more/admin/AdminKpiStrip";
import { AdminReportCard } from "@/components/more/admin/reports/AdminReportCard";
import { PeriodNavigator } from "@/components/hours/PeriodNavigator";
import { EmptyState } from "@/components/shared/EmptyState";
import { SegmentedTabs, type SegmentedOption } from "@/components/shared/SegmentedTabs";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/modules/auth/profile";
import { getCompanyReportsInRange } from "@/modules/reports/queries";
import type { SiteReportWithNames, WorkCategory } from "@/modules/reports/types";
import type { Site } from "@/modules/sites/queries";
import type { Worker } from "@/modules/team/queries";
import { dateKeyOf } from "@/modules/time/calc";

const FILTER_ALL = "all";

function addMonthsSafe(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

interface AdminReportsScreenProps {
  profile: Profile;
  initialReports: readonly SiteReportWithNames[];
  categories: readonly WorkCategory[];
  sites: readonly Site[];
  workers: readonly Worker[];
}

/**
 * Розділ «Звіти» адмінки — компанійська стрічка звітів за місяць з
 * фільтрами по об'єкту/співробітнику/категорії й видаленням прямо з картки.
 * На відміну від особистої стрічки `/reports` тут немає групування по датах
 * і форми створення — тільки огляд і базові дії (REPORTS.md сюди не
 * заглядаємо, це новий розділ адмінки).
 */
export function AdminReportsScreen({
  profile,
  initialReports,
  categories,
  sites,
  workers,
}: AdminReportsScreenProps) {
  const supabase = useMemo(() => createClient(), []);

  const [month, setMonth] = useState(() => new Date());
  const [reports, setReports] = useState<readonly SiteReportWithNames[]>(initialReports);
  const [isLoading, startLoadTransition] = useTransition();

  const [siteFilter, setSiteFilter] = useState(FILTER_ALL);
  const [workerFilter, setWorkerFilter] = useState(FILTER_ALL);
  const [categoryFilter, setCategoryFilter] = useState(FILTER_ALL);

  useEffect(() => {
    let cancelled = false;
    const from = dateKeyOf(startOfMonth(month));
    const to = dateKeyOf(endOfMonth(month));

    startLoadTransition(async () => {
      try {
        const data = await getCompanyReportsInRange(supabase, profile.company_id, from, to);
        if (!cancelled) setReports(data);
      } catch {
        if (!cancelled) toast(t.admin.reports.loadError);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [supabase, profile.company_id, month]);

  const siteOptions: readonly SegmentedOption<string>[] = useMemo(
    () => [
      { value: FILTER_ALL, label: t.admin.reports.filterSiteAll },
      ...sites.map((site) => ({ value: site.id, label: site.name })),
    ],
    [sites],
  );

  const workerOptions: readonly SegmentedOption<string>[] = useMemo(
    () => [
      { value: FILTER_ALL, label: t.admin.reports.filterWorkerAll },
      ...workers.map((worker) => ({ value: worker.id, label: worker.full_name })),
    ],
    [workers],
  );

  const categoryOptions: readonly SegmentedOption<string>[] = useMemo(
    () => [
      { value: FILTER_ALL, label: t.admin.reports.filterCategoryAll },
      ...categories.map((category) => ({ value: category.label, label: category.label })),
    ],
    [categories],
  );

  const filteredReports = useMemo(
    () =>
      reports.filter((report) => {
        if (siteFilter !== FILTER_ALL && report.site_id !== siteFilter) return false;
        if (workerFilter !== FILTER_ALL && report.author_id !== workerFilter) return false;
        if (categoryFilter !== FILTER_ALL && !report.category_labels.includes(categoryFilter)) {
          return false;
        }
        return true;
      }),
    [reports, siteFilter, workerFilter, categoryFilter],
  );

  const photosTotal = filteredReports.reduce((sum, report) => sum + report.photo_count, 0);

  const hasActiveFilters =
    siteFilter !== FILTER_ALL || workerFilter !== FILTER_ALL || categoryFilter !== FILTER_ALL;

  const monthTitle = `${t.months.nominative[month.getMonth()]} ${month.getFullYear()}`;

  const handleDeleted = (reportId: string) => {
    setReports((current) => current.filter((report) => report.id !== reportId));
  };

  return (
    <div className="flex flex-col gap-4 px-4 pb-24 lg:px-0 lg:pb-0">
      <PeriodNavigator
        title={monthTitle}
        onPrev={() => setMonth((current) => addMonthsSafe(current, -1))}
        onNext={() => setMonth((current) => addMonthsSafe(current, 1))}
      />

      <AdminKpiStrip
        cells={[
          {
            icon: FileText,
            label: t.admin.reports.kpiReports,
            value: String(filteredReports.length),
            muted: filteredReports.length === 0,
          },
          {
            icon: Camera,
            label: t.admin.reports.kpiPhotos,
            value: String(photosTotal),
            muted: photosTotal === 0,
          },
        ]}
      />

      <div className="flex flex-col gap-2">
        <SegmentedTabs
          size="sm"
          label={t.admin.reports.filterSiteLabel}
          options={siteOptions}
          value={siteFilter}
          onChange={setSiteFilter}
        />
        <SegmentedTabs
          size="sm"
          label={t.admin.reports.filterWorkerLabel}
          options={workerOptions}
          value={workerFilter}
          onChange={setWorkerFilter}
        />
        {categoryOptions.length > 1 && (
          <SegmentedTabs
            size="sm"
            label={t.admin.reports.filterCategoryLabel}
            options={categoryOptions}
            value={categoryFilter}
            onChange={setCategoryFilter}
          />
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-[140px] rounded-[12px]" />
          ))}
        </div>
      ) : filteredReports.length === 0 ? (
        <EmptyState
          title={hasActiveFilters ? t.admin.reports.emptyFilteredTitle : t.admin.reports.emptyTitle}
          description={hasActiveFilters ? t.admin.reports.emptyFilteredHint : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {filteredReports.map((report) => (
            <AdminReportCard key={report.id} report={report} onDeleted={handleDeleted} />
          ))}
        </div>
      )}
    </div>
  );
}
