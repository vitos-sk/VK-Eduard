"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import {
  ReportsSortSelect,
  type ReportSort,
} from "@/components/reports/ReportsSortSelect";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { FiltersDrawer } from "@/components/shared/FiltersDrawer";
import { ReportCard } from "@/components/shared/ReportCard";
import { SearchField } from "@/components/shared/SearchField";
import {
  SegmentedTabs,
  type SegmentedOption,
} from "@/components/shared/SegmentedTabs";
import { fmt } from "@/lib/format";
import { t } from "@/lib/i18n";
import { reportGroups } from "@/lib/mock/reports";
import type { Report } from "@/lib/types";
import { cn } from "@/lib/utils";

/** «Усі» + два статуса, в которых бывают отчёты. */
type ReportFilter = "all" | "in_progress" | "completed";

const FILTER_OPTIONS: readonly SegmentedOption<ReportFilter>[] = [
  { value: "all", label: t.reports.tabs.all },
  { value: "in_progress", label: t.reports.tabs.inProgress },
  { value: "completed", label: t.reports.tabs.completed },
];

/** Группа списка: заголовок слева, счётчик справа. */
interface DisplayGroup {
  key: string;
  title: string;
  reports: readonly Report[];
}

/** Отчёты в плоском виде — порядок дат из моков сохраняется. */
const allReports: readonly Report[] = reportGroups.flatMap(
  (group) => group.reports,
);

/** Заголовки групп при сортировке по статусу. */
const STATUS_GROUPS: readonly { status: Report["status"]; title: string }[] = [
  { status: "in_progress", title: t.reports.tabs.inProgress },
  { status: "completed", title: t.reports.tabs.completed },
];

function groupReports(
  items: readonly Report[],
  sort: ReportSort,
): DisplayGroup[] {
  if (sort === "date") {
    const kept = new Set(items.map((report) => report.id));

    return reportGroups
      .map((group) => ({
        key: group.date,
        title: group.title,
        reports: group.reports.filter((report) => kept.has(report.id)),
      }))
      .filter((group) => group.reports.length > 0);
  }

  if (sort === "object") {
    const byObject = new Map<string, Report[]>();

    for (const report of items) {
      const list = byObject.get(report.objectName) ?? [];
      list.push(report);
      byObject.set(report.objectName, list);
    }

    return [...byObject].map(([objectName, list]) => ({
      key: objectName,
      title: objectName,
      reports: list,
    }));
  }

  return STATUS_GROUPS.map(({ status, title }) => ({
    key: status,
    title,
    reports: items.filter((report) => report.status === status),
  })).filter((group) => group.reports.length > 0);
}

/**
 * Экран «Звіти»: фильтр по статусу, поиск, выбор группировки
 * и список карточек, разбитый на секции с заголовками.
 */
export function ReportsScreen() {
  const [filter, setFilter] = useState<ReportFilter>("all");
  const [sort, setSort] = useState<ReportSort>("date");
  const [query, setQuery] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const groups = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("uk");

    const filtered = allReports.filter((report) => {
      if (filter !== "all" && report.status !== filter) {
        return false;
      }

      if (!needle) {
        return true;
      }

      const haystack = [
        report.objectName,
        ...report.workKinds.map((kind) => t.workKind[kind]),
      ]
        .join(" ")
        .toLocaleLowerCase("uk");

      return haystack.includes(needle);
    });

    return groupReports(filtered, sort);
  }, [filter, sort, query]);

  return (
    <div className="pb-6">
      <ScreenHeader
        title={t.reports.title}
        action={
          <button
            type="button"
            aria-label={t.reports.createReport}
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-full bg-brand text-brand-ink",
              "transition-transform duration-150 active:scale-95",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
            )}
          >
            <Plus className="size-6" strokeWidth={2.6} aria-hidden />
          </button>
        }
      />

      <div className="px-4">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder={t.reports.searchPlaceholder}
          onFilterClick={() => setIsFiltersOpen(true)}
        />

        <div className="mt-3 flex items-center gap-2">
          <SegmentedTabs
            className="mx-0 min-w-0 flex-1 px-0"
            options={FILTER_OPTIONS}
            value={filter}
            onChange={setFilter}
            label={t.reports.title}
          />

          <ReportsSortSelect value={sort} onChange={setSort} />
        </div>

        {groups.length > 0 ? (
          groups.map((group) => (
            <section key={group.key} className="mt-6 first:mt-5">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="min-w-0 truncate text-[20px] font-bold">
                  {group.title}
                </h2>
                <span className="shrink-0 text-[13px] font-medium text-text-muted">
                  {fmt(t.reports.reportsCount, { n: group.reports.length })}
                </span>
              </div>

              <div className="mt-3 space-y-3">
                {group.reports.map((report) => (
                  <ReportCard key={report.id} report={report} />
                ))}
              </div>
            </section>
          ))
        ) : (
          <EmptyState
            className="mt-6"
            title={t.common.notFound}
            description={t.common.notFoundHint}
          />
        )}
      </div>

      <FiltersDrawer open={isFiltersOpen} onOpenChange={setIsFiltersOpen} />
    </div>
  );
}
