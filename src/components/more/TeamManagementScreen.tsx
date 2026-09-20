"use client";

import { useCallback, useMemo, useState } from "react";
import { UserPlus } from "lucide-react";

import { AddWorkerForm } from "@/components/reports/AddWorkerForm";
import { DeactivateWorkerButton } from "@/components/reports/DeactivateWorkerButton";
import { DailyNormEditor } from "@/components/more/team/DailyNormEditor";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatHoursShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import { companyStrings as s } from "@/lib/i18n/parts/company";
import { createClient } from "@/lib/supabase/client";
import type { WorkEntryWithNames } from "@/modules/entries/types";
import { buildWorkerHoursList } from "@/modules/team/hours";
import { getCompanyWorkers, type Worker } from "@/modules/team/queries";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/shared/SearchField";

interface TeamManagementScreenProps {
  companyId: string;
  currentUserId: string;
  workers: readonly Worker[];
  entries: readonly WorkEntryWithNames[];
}

/**
 * Керування командою на `/more/team` (тільки boss): пошук, години за поточний
 * місяць, заведення, деактивація і редактор денної норми співробітника.
 */
export function TeamManagementScreen({
  companyId,
  currentUserId,
  workers: initialWorkers,
  entries,
}: TeamManagementScreenProps) {
  const supabase = useMemo(() => createClient(), []);
  const [workers, setWorkers] = useState<readonly Worker[]>(initialWorkers);
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const refreshWorkers = useCallback(() => {
    getCompanyWorkers(supabase, companyId)
      .then((data) => setWorkers(data))
      .catch(() => {
        // Мережа моргнула — лишаємо попередній список.
      });
  }, [supabase, companyId]);

  const hoursByWorker = useMemo(() => {
    const list = buildWorkerHoursList(workers, entries);
    return new Map(list.map((item) => [item.id, item.minutes]));
  }, [workers, entries]);

  const visibleWorkers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return workers;
    return workers.filter((worker) => worker.full_name.toLowerCase().includes(query));
  }, [workers, search]);

  const hasActiveSearch = search.trim().length > 0;

  return (
    <div className="flex flex-col gap-4 px-4 pb-6 lg:mx-auto lg:max-w-[960px]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchField
          compact
          className="flex-1 lg:max-w-[320px]"
          value={search}
          onChange={setSearch}
          placeholder={s.team.searchPlaceholder}
        />

        <Button size="md" onClick={() => setIsAddOpen((open) => !open)} aria-expanded={isAddOpen}>
          <UserPlus className="size-[18px]" strokeWidth={2.2} aria-hidden />
          {s.team.addWorker}
        </Button>
      </div>

      {isAddOpen && (
        <AddWorkerForm
          className="lg:max-w-[480px]"
          onClose={() => setIsAddOpen(false)}
          onCreated={() => {
            setIsAddOpen(false);
            refreshWorkers();
          }}
        />
      )}

      {visibleWorkers.length === 0 ? (
        <EmptyState
          title={hasActiveSearch ? s.team.emptySearchTitle : s.team.empty}
          description={hasActiveSearch ? s.team.emptySearchHint : s.team.emptyHint}
        />
      ) : (
        <ul className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-3">
          {visibleWorkers.map((worker) => (
            <li
              key={worker.id}
              className="flex flex-col gap-3 rounded-[14px] border border-border bg-surface-2 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-bold">{worker.full_name}</p>
                  <p className="text-[13px] font-medium text-text-muted">
                    {worker.role === "boss" ? t.profile.roleBoss : t.profile.roleWorker}
                  </p>
                </div>

                <p className="tabular shrink-0 text-[15px] font-bold">
                  {formatHoursShort(hoursByWorker.get(worker.id) ?? 0)}
                  <span className="ml-1 text-[12px] font-medium text-text-dim">
                    {s.team.hoursThisMonth}
                  </span>
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                <DailyNormEditor workerId={worker.id} initialMinutes={worker.daily_norm_minutes} />

                {worker.id !== currentUserId && (
                  <DeactivateWorkerButton
                    workerId={worker.id}
                    onDeactivated={refreshWorkers}
                    className="h-9 w-auto shrink-0 px-3 text-[13px]"
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
