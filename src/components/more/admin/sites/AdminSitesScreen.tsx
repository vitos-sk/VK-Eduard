"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { endOfMonth, startOfMonth } from "date-fns";
import { Building2, Plus } from "lucide-react";

import { PeriodNavigator } from "@/components/hours/PeriodNavigator";
import { EmptyState } from "@/components/shared/EmptyState";
import { SearchField } from "@/components/shared/SearchField";
import { SegmentedTabs, type SegmentedOption } from "@/components/shared/SegmentedTabs";
import { SiteAdminList } from "@/components/more/admin/sites/SiteAdminList";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { getCompanyEntriesInRange } from "@/modules/entries/queries";
import type { WorkEntryWithNames } from "@/modules/entries/types";
import { buildSiteHoursList, type SiteWithHours } from "@/modules/sites/hours";
import type { Site } from "@/modules/sites/queries";
import { dateKeyOf } from "@/modules/time/calc";

export type SiteWithStats = SiteWithHours;

type ArchiveFilter = "active" | "archived" | "all";

const ARCHIVE_OPTIONS: readonly SegmentedOption<ArchiveFilter>[] = [
  { value: "active", label: t.admin.sites.tabs.active },
  { value: "archived", label: t.admin.sites.tabs.archived },
  { value: "all", label: t.admin.sites.tabs.all },
];

function addMonthsSafe(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

interface AdminSitesScreenProps {
  companyId: string;
  sites: readonly Site[];
  initialEntries: readonly WorkEntryWithNames[];
}

/**
 * Оркестратор `/more/admin/sites`: агрегує години й кількість людей на
 * кожному об'єкті за обраний місяць (`getCompanyEntriesInRange`, та сама
 * схема, що й `AdminScreen`), поверх готового списку об'єктів (`getAllSites`,
 * прийшов зі сторінки). Список об'єктів оновлюється сам, коли `router.refresh()`
 * після архівації/видалення перезапускає серверну сторінку — тут він завжди
 * просто пропс, без копіювання в локальний стан.
 */
export function AdminSitesScreen({ companyId, sites, initialEntries }: AdminSitesScreenProps) {
  const supabase = useMemo(() => createClient(), []);

  const [month, setMonth] = useState(() => new Date());
  const [entries, setEntries] = useState<readonly WorkEntryWithNames[]>(initialEntries);
  const [search, setSearch] = useState("");
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>("active");
  const [isLoading, startLoadTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    const from = dateKeyOf(startOfMonth(month));
    const to = dateKeyOf(endOfMonth(month));

    startLoadTransition(async () => {
      try {
        const data = await getCompanyEntriesInRange(supabase, companyId, from, to);
        if (!cancelled) setEntries(data);
      } catch {
        // Мережа моргнула — лишаємо попередні дані на екрані.
      }
    });

    return () => {
      cancelled = true;
    };
  }, [supabase, companyId, month]);

  const monthTitle = `${t.months.nominative[month.getMonth()]} ${month.getFullYear()}`;

  const sitesWithStats = useMemo<SiteWithStats[]>(
    () => buildSiteHoursList(sites, entries),
    [sites, entries],
  );

  const visibleSites = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("uk");

    return sitesWithStats.filter((site) => {
      if (archiveFilter === "active" && site.archived_at !== null) return false;
      if (archiveFilter === "archived" && site.archived_at === null) return false;

      if (!query) return true;

      return (
        site.name.toLocaleLowerCase("uk").includes(query) ||
        (site.address ?? "").toLocaleLowerCase("uk").includes(query)
      );
    });
  }, [sitesWithStats, archiveFilter, search]);

  const hasAnySites = sites.length > 0;
  const hasActiveFilters = search.trim().length > 0 || archiveFilter !== "active";

  return (
    <div className="flex flex-col gap-4 px-4 pb-24 lg:px-0 lg:pb-0">
      <div className="flex items-center justify-between gap-3">
        <SegmentedTabs
          options={ARCHIVE_OPTIONS}
          value={archiveFilter}
          onChange={setArchiveFilter}
          label={t.admin.nav.sites}
          className="-mx-0 flex-1 px-0"
        />

        <Link
          href="/objects/new"
          className={cn(
            "flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-brand px-4 text-[14px] font-bold text-brand-ink",
            "transition-transform duration-150 active:scale-95",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          )}
        >
          <Plus className="size-[18px]" strokeWidth={2.4} aria-hidden />
          <span className="hidden sm:inline">{t.admin.sites.addObject}</span>
        </Link>
      </div>

      <PeriodNavigator
        title={monthTitle}
        onPrev={() => setMonth((current) => addMonthsSafe(current, -1))}
        onNext={() => setMonth((current) => addMonthsSafe(current, 1))}
      />

      <SearchField
        value={search}
        onChange={setSearch}
        placeholder={t.admin.sites.searchPlaceholder}
      />

      {visibleSites.length === 0 ? (
        <EmptyState
          className="mt-2"
          icon={Building2}
          title={hasAnySites ? t.admin.sites.emptySearchTitle : t.admin.sites.emptyTitle}
          description={
            hasAnySites && hasActiveFilters
              ? t.admin.sites.emptySearchHint
              : !hasAnySites
                ? t.admin.sites.emptyHint
                : undefined
          }
        />
      ) : (
        <div
          className={cn(
            "transition-opacity",
            isLoading && "pointer-events-none opacity-60",
          )}
        >
          <SiteAdminList sites={visibleSites} />
        </div>
      )}
    </div>
  );
}
