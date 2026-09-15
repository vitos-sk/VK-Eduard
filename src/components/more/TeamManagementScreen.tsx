"use client";

import { useCallback, useMemo, useState } from "react";
import { UserPlus } from "lucide-react";

import { AddWorkerForm } from "@/components/reports/AddWorkerForm";
import { DeactivateWorkerButton } from "@/components/reports/DeactivateWorkerButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { getCompanyWorkers, type Worker } from "@/modules/team/queries";

interface TeamManagementScreenProps {
  companyId: string;
  currentUserId: string;
  initialWorkers: readonly Worker[];
}

/**
 * Керування командою на `/more/team` (тільки boss): заведення нового
 * співробітника (`AddWorkerForm`, перенесено сюди з вкладки «Команда»
 * у «Звітах») і деактивація наявних. Роздача годин по працівниках
 * лишається на вкладці «Команда» — тут тільки склад команди.
 */
export function TeamManagementScreen({
  companyId,
  currentUserId,
  initialWorkers,
}: TeamManagementScreenProps) {
  const supabase = useMemo(() => createClient(), []);
  const [workers, setWorkers] = useState<readonly Worker[]>(initialWorkers);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const refreshWorkers = useCallback(() => {
    getCompanyWorkers(supabase, companyId)
      .then((data) => setWorkers(data))
      .catch(() => {});
  }, [supabase, companyId]);

  return (
    <div className="flex flex-col gap-4 px-4 pb-6 lg:mx-auto lg:max-w-[480px]">
      <button
        type="button"
        onClick={() => setIsAddOpen((open) => !open)}
        className={cn(
          "flex h-12 w-full items-center justify-center gap-2 rounded-[14px]",
          "bg-brand text-[15px] font-bold text-brand-ink",
          "transition-transform duration-150 active:scale-[0.98]",
        )}
      >
        <UserPlus className="size-[18px]" strokeWidth={2.2} aria-hidden />
        {t.reports.team.addWorker}
      </button>

      {isAddOpen && (
        <AddWorkerForm
          onClose={() => setIsAddOpen(false)}
          onCreated={() => {
            setIsAddOpen(false);
            refreshWorkers();
          }}
        />
      )}

      {workers.length === 0 ? (
        <EmptyState title={t.profile.teamPage.empty} />
      ) : (
        <ul className="flex flex-col gap-2">
          {workers
            .filter((worker) => worker.id !== currentUserId)
            .map((worker) => (
              <li
                key={worker.id}
                className="flex items-center justify-between gap-3 rounded-[14px] border border-border bg-surface-2 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-bold">{worker.full_name}</p>
                  <p className="text-[13px] font-medium text-text-muted">
                    {worker.role === "boss" ? t.profile.roleBoss : t.profile.roleWorker}
                  </p>
                </div>

                <DeactivateWorkerButton
                  workerId={worker.id}
                  onDeactivated={refreshWorkers}
                  className="h-10 w-auto shrink-0 px-4"
                />
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
