"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { endOfMonth, startOfMonth } from "date-fns";
import { ListChecks } from "lucide-react";

import { EntriesAdminList } from "@/components/more/admin/entries/EntriesAdminList";
import { PeriodNavigator } from "@/components/hours/PeriodNavigator";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fmt } from "@/lib/format";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { getCompanyEntriesInRange } from "@/modules/entries/queries";
import type { WorkEntryWithNames } from "@/modules/entries/types";
import type { Site } from "@/modules/sites/queries";
import type { Worker } from "@/modules/team/queries";
import { dateKeyOf } from "@/modules/time/calc";
import { cn } from "@/lib/utils";

const ALL = "all";
/** Скільки рядків показувати одразу — компанія на десятки людей, не тисячі. */
const PAGE_SIZE = 50;

const selectTriggerClassName = cn(
  "mt-1 h-11 w-full rounded-[12px] border-border bg-surface-2 px-3",
  "text-[14px] font-bold text-text",
  "focus-visible:border-border focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
);

function addMonthsSafe(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

interface AdminEntriesScreenProps {
  companyId: string;
  workers: readonly Worker[];
  sites: readonly Site[];
  initialEntries: readonly WorkEntryWithNames[];
}

/**
 * Оркестратор `/more/admin/entries` — усі записи компанії за обраний місяць
 * (`getCompanyEntriesInRange`, та сама схема, що й `AdminScreen`), з
 * фільтрами по співробітнику й об'єкту. Категорії в `work_entries` немає
 * (вона є тільки у звітів), тож окремого фільтра по ній тут нема.
 */
export function AdminEntriesScreen({
  companyId,
  workers,
  sites,
  initialEntries,
}: AdminEntriesScreenProps) {
  const supabase = useMemo(() => createClient(), []);

  const [month, setMonth] = useState(() => new Date());
  const [entries, setEntries] = useState<readonly WorkEntryWithNames[]>(initialEntries);
  const [workerFilter, setWorkerFilter] = useState(ALL);
  const [siteFilter, setSiteFilter] = useState(ALL);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoading, startLoadTransition] = useTransition();
  const requestIdRef = useRef(0);

  /**
   * Єдине джерело завантаження записів за поточний місяць — викликається і
   * автоматично (при зміні місяця/маунті через ефект нижче), і вручну як
   * `onChanged` після мутації запису. `requestIdRef` відкидає відповідь
   * застарілого запиту, якщо між ними встиг прилетіти новіший (напр. швидка
   * зміна місяця).
   */
  const refetch = useCallback(() => {
    const requestId = ++requestIdRef.current;
    const from = dateKeyOf(startOfMonth(month));
    const to = dateKeyOf(endOfMonth(month));

    startLoadTransition(async () => {
      try {
        const data = await getCompanyEntriesInRange(supabase, companyId, from, to);
        if (requestIdRef.current === requestId) setEntries(data);
      } catch {
        // Мережа моргнула — лишаємо попередні дані на екрані.
      }
    });
  }, [supabase, companyId, month]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const monthTitle = `${t.months.nominative[month.getMonth()]} ${month.getFullYear()}`;

  const filteredEntries = useMemo(
    () =>
      entries.filter((entry) => {
        if (workerFilter !== ALL && entry.author_id !== workerFilter) return false;
        if (siteFilter !== ALL && entry.site_id !== siteFilter) return false;
        return true;
      }),
    [entries, workerFilter, siteFilter],
  );

  const visibleEntries = filteredEntries.slice(0, visibleCount);
  const hasMore = filteredEntries.length > visibleEntries.length;
  const hasActiveFilters = workerFilter !== ALL || siteFilter !== ALL;

  return (
    <div className="flex flex-col gap-4 px-4 pb-24 lg:px-0 lg:pb-0">
      <PeriodNavigator
        title={monthTitle}
        onPrev={() => {
          setMonth((current) => addMonthsSafe(current, -1));
          setVisibleCount(PAGE_SIZE);
        }}
        onNext={() => {
          setMonth((current) => addMonthsSafe(current, 1));
          setVisibleCount(PAGE_SIZE);
        }}
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[12px] font-medium text-text-muted">
            {t.admin.entries.filterWorkerLabel}
          </label>
          <Select
            value={workerFilter}
            onValueChange={(value) => {
              setWorkerFilter(value);
              setVisibleCount(PAGE_SIZE);
            }}
          >
            <SelectTrigger className={selectTriggerClassName}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t.admin.entries.filterWorkerAll}</SelectItem>
              {workers.map((worker) => (
                <SelectItem key={worker.id} value={worker.id}>
                  {worker.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-[12px] font-medium text-text-muted">
            {t.admin.entries.filterSiteLabel}
          </label>
          <Select
            value={siteFilter}
            onValueChange={(value) => {
              setSiteFilter(value);
              setVisibleCount(PAGE_SIZE);
            }}
          >
            <SelectTrigger className={selectTriggerClassName}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t.admin.entries.filterSiteAll}</SelectItem>
              {sites.map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {visibleEntries.length === 0 ? (
        <EmptyState
          className="mt-2"
          icon={ListChecks}
          title={hasActiveFilters ? t.admin.entries.emptyFilteredTitle : t.admin.entries.emptyTitle}
          description={hasActiveFilters ? t.admin.entries.emptyFilteredHint : undefined}
        />
      ) : (
        <>
          <div
            className={cn(
              "transition-opacity",
              isLoading && "pointer-events-none opacity-60",
            )}
          >
            <EntriesAdminList entries={visibleEntries} sites={sites} onChanged={refetch} />
          </div>

          <div className="flex flex-col items-center gap-2 pt-1">
            <p className="text-[12px] font-medium text-text-muted">
              {fmt(t.admin.entries.shownCount, {
                shown: visibleEntries.length,
                total: filteredEntries.length,
              })}
            </p>

            {hasMore && (
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                className={cn(
                  "h-10 rounded-full border border-border px-4 text-[13px] font-bold text-text",
                  "transition-colors duration-150 hover:bg-surface-2",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                )}
              >
                {t.admin.entries.loadMore}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
