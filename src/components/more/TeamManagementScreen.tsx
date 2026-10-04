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
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { initialsOf } from "@/components/shared/Thumb";
import { useAvatarUrls } from "@/components/shared/useAvatarUrls";
import { Ticket } from "@/components/ui/ticket";
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
  const avatarUrls = useAvatarUrls(workers);
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
    <div className="flex flex-col gap-3.5 px-4 pb-6 lg:mx-auto lg:max-w-[960px] lg:px-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchField
          compact
          className="flex-1 lg:max-w-[320px]"
          value={search}
          onChange={setSearch}
          placeholder={s.team.searchPlaceholder}
        />

        <Button onClick={() => setIsAddOpen((open) => !open)} aria-expanded={isAddOpen}>
          <UserPlus className="size-[18px]" strokeWidth={1.9} aria-hidden />
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
            <Ticket asChild variant="flat" key={worker.id} className="flex flex-col gap-3">
            <li>
              <div className="flex items-start justify-between gap-3">
                <Avatar
                  initials={initialsOf(worker.full_name)}
                  src={avatarUrls[worker.id]}
                  className="size-11"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold">{worker.full_name}</p>
                  <p className="text-[13px] text-ink-2">
                    {worker.role === "boss" ? t.profile.roleBoss : t.profile.roleWorker}
                  </p>
                </div>

                <p className="tabular shrink-0 text-[15px] font-semibold">
                  {formatHoursShort(hoursByWorker.get(worker.id) ?? 0)}
                  <span className="ml-1 text-[12px] font-normal text-ink-2">
                    {s.team.hoursThisMonth}
                  </span>
                </p>
              </div>

              <div className="perf-t flex flex-wrap items-center justify-between gap-3 pt-3">
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
            </Ticket>
          ))}
        </ul>
      )}
    </div>
  );
}
