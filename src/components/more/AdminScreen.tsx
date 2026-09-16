"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { endOfMonth, startOfMonth } from "date-fns";
import { Clock, Search, Users } from "lucide-react";

import { AdminWorkerList } from "@/components/more/AdminWorkerList";
import { DefaultViewToggle } from "@/components/more/DefaultViewToggle";
import { ShareWhatsAppButton } from "@/components/more/ShareWhatsAppButton";
import { StatTile } from "@/components/dashboard/StatTile";
import { PeriodNavigator } from "@/components/hours/PeriodNavigator";
import { ExportMenu } from "@/components/reports/ExportMenu";
import { EmptyState } from "@/components/shared/EmptyState";
import { fmt, formatHoursShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/modules/auth/profile";
import { getCompanyEntriesInRange } from "@/modules/entries/queries";
import type { WorkEntryWithNames } from "@/modules/entries/types";
import { buildWorkerHoursList } from "@/modules/team/hours";
import type { Worker } from "@/modules/team/queries";
import { dateKeyOf } from "@/modules/time/calc";

interface AdminScreenProps {
  profile: Profile;
  workers: readonly Worker[];
  initialEntries: readonly WorkEntryWithNames[];
}

function addMonthsSafe(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

/**
 * Оркестратор `/more/admin` (тільки `boss`). Перший кадр (поточний місяць)
 * приходить із сервера, зміна місяця тягне дані з браузера — та сама схема,
 * що і в `TeamTab`/`DashboardScreen`.
 */
export function AdminScreen({ profile, workers, initialEntries }: AdminScreenProps) {
  const supabase = useMemo(() => createClient(), []);

  const [month, setMonth] = useState(() => new Date());
  const [entries, setEntries] = useState<readonly WorkEntryWithNames[]>(initialEntries);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const from = dateKeyOf(startOfMonth(month));
    const to = dateKeyOf(endOfMonth(month));

    getCompanyEntriesInRange(supabase, profile.company_id, from, to)
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch(() => {
        // Мережа моргнула — лишаємо попередні дані на екрані.
      });

    return () => {
      cancelled = true;
    };
  }, [supabase, profile.company_id, month]);

  const allWorkerHours = useMemo(() => buildWorkerHoursList(workers, entries), [workers, entries]);

  const visibleWorkerHours = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return allWorkerHours;
    return allWorkerHours.filter((item) => item.name.toLowerCase().includes(query));
  }, [allWorkerHours, search]);

  const effectiveWorkerHours = selectedIds.size > 0
    ? allWorkerHours.filter((item) => selectedIds.has(item.id))
    : visibleWorkerHours;

  const totalMinutes = effectiveWorkerHours.reduce((sum, item) => sum + item.minutes, 0);
  const avgMinutes =
    effectiveWorkerHours.length === 0 ? 0 : Math.round(totalMinutes / effectiveWorkerHours.length);

  const monthFrom = dateKeyOf(startOfMonth(month));
  const monthTo = dateKeyOf(endOfMonth(month));
  const monthTitle = `${t.months.nominative[month.getMonth()]} ${month.getFullYear()}`;

  const allVisibleSelected =
    visibleWorkerHours.length > 0 && visibleWorkerHours.every((item) => selectedIds.has(item.id));

  const toggleWorker = useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        for (const item of visibleWorkerHours) next.delete(item.id);
      } else {
        for (const item of visibleWorkerHours) next.add(item.id);
      }
      return next;
    });
  }, [allVisibleSelected, visibleWorkerHours]);

  const hasActiveSearch = search.trim().length > 0;
  const exportWorkerIds =
    selectedIds.size > 0
      ? [...selectedIds]
      : hasActiveSearch
        ? visibleWorkerHours.map((item) => item.id)
        : undefined;

  return (
    <div className="flex flex-col gap-4 px-4 pb-24 lg:mx-auto lg:max-w-[720px]">
      <DefaultViewToggle profile={profile} />

      <PeriodNavigator
        title={monthTitle}
        onPrev={() => setMonth((current) => addMonthsSafe(current, -1))}
        onNext={() => setMonth((current) => addMonthsSafe(current, 1))}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile icon={Clock} label={t.admin.panel.kpiHours} value={formatHoursShort(totalMinutes)} />
        <StatTile icon={Users} label={t.admin.panel.kpiActive} value={String(effectiveWorkerHours.length)} />
        <StatTile icon={Clock} label={t.admin.panel.kpiAvg} value={formatHoursShort(avgMinutes)} />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex h-11 flex-1 items-center gap-2 rounded-[12px] border border-border bg-surface-2 px-3">
          <Search className="size-4 shrink-0 text-text-dim" strokeWidth={2} aria-hidden />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t.admin.panel.searchPlaceholder}
            className="w-full bg-transparent text-[14px] font-medium outline-none placeholder:text-text-dim"
          />
        </div>

        <button
          type="button"
          onClick={toggleSelectAll}
          className="h-11 shrink-0 rounded-[12px] border border-border px-4 text-[14px] font-bold text-text"
        >
          {allVisibleSelected ? t.admin.panel.deselectAll : t.admin.panel.selectAll}
        </button>
      </div>

      {visibleWorkerHours.length === 0 ? (
        <EmptyState title={t.admin.panel.empty} />
      ) : (
        <AdminWorkerList items={visibleWorkerHours} selectedIds={selectedIds} onToggle={toggleWorker} />
      )}

      <div className="sticky bottom-4 mt-2 flex items-center gap-2 rounded-[16px] border border-border bg-surface p-3 shadow-lg">
        <p className="flex-1 truncate text-[13px] font-bold text-text-muted">
          {selectedIds.size > 0
            ? fmt(t.admin.panel.selected, { n: selectedIds.size })
            : t.admin.panel.selectedAll}
        </p>

        <ExportMenu from={monthFrom} to={monthTo} workerIds={exportWorkerIds} />
        <ShareWhatsAppButton from={monthFrom} to={monthTo} workerIds={exportWorkerIds} />
      </div>
    </div>
  );
}
