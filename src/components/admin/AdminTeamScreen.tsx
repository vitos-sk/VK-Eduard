"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { uk as ukLocale } from "date-fns/locale";
import { ChevronLeft, UserPlus } from "lucide-react";

import { AddWorkerForm } from "@/components/reports/AddWorkerForm";
import { ReportsFeed } from "@/components/reports/ReportsFeed";
import { EmptyState } from "@/components/shared/EmptyState";
import { PeriodNavigator } from "@/components/hours/PeriodNavigator";
import { ExportMenu } from "@/components/admin/ExportMenu";
import { formatHoursShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { getCompanyEntriesInRange, getEntriesFeed } from "@/modules/entries/queries";
import type { WorkEntryWithNames, WorkEntryWithPhotos } from "@/modules/entries/types";
import { getSignedPhotoUrls } from "@/modules/media/signedUrls";
import type { Site } from "@/modules/sites/queries";
import { getCompanyWorkers, type Worker } from "@/modules/team/queries";
import { dateKeyOf } from "@/modules/time/calc";
import { cn } from "@/lib/utils";

function sumMinutesByAuthor(
  entries: readonly WorkEntryWithNames[],
): ReadonlyMap<string, number> {
  const map = new Map<string, number>();

  for (const entry of entries) {
    map.set(entry.author_id, (map.get(entry.author_id) ?? 0) + (entry.total_minutes ?? 0));
  }

  return map;
}

interface AdminTeamScreenProps {
  companyId: string;
  sites: readonly Site[];
}

/**
 * Десктопна версія вкладки «Команда» (`components/reports/TeamTab.tsx`) —
 * та сама бізнес-логіка й ті самі запити, тільки широка таблиця замість
 * списку карток і `ExportMenu` замість однієї CSV-кнопки.
 */
export function AdminTeamScreen({ companyId, sites }: AdminTeamScreenProps) {
  const supabase = useMemo(() => createClient(), []);

  const [workers, setWorkers] = useState<readonly Worker[]>([]);
  const [month, setMonth] = useState(() => new Date());
  const [monthMinutes, setMonthMinutes] = useState<ReadonlyMap<string, number>>(new Map());
  const [weekMinutes, setWeekMinutes] = useState<ReadonlyMap<string, number>>(new Map());

  const [openWorkerId, setOpenWorkerId] = useState<string | null>(null);
  const [openEntries, setOpenEntries] = useState<readonly WorkEntryWithPhotos[]>([]);
  const [openThumbUrls, setOpenThumbUrls] = useState<Readonly<Record<string, string>>>({});
  const [isOpenLoading, setIsOpenLoading] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const refreshWorkers = useCallback(() => {
    getCompanyWorkers(supabase, companyId)
      .then((data) => setWorkers(data))
      .catch(() => {});
  }, [supabase, companyId]);

  useEffect(() => {
    refreshWorkers();
  }, [refreshWorkers]);

  const monthFrom = dateKeyOf(startOfMonth(month));
  const monthTo = dateKeyOf(endOfMonth(month));

  useEffect(() => {
    let cancelled = false;
    const weekFrom = dateKeyOf(startOfWeek(new Date(), { locale: ukLocale }));
    const weekTo = dateKeyOf(endOfWeek(new Date(), { locale: ukLocale }));

    Promise.all([
      getCompanyEntriesInRange(supabase, companyId, monthFrom, monthTo),
      getCompanyEntriesInRange(supabase, companyId, weekFrom, weekTo),
    ])
      .then(([monthEntries, weekEntries]) => {
        if (cancelled) return;
        setMonthMinutes(sumMinutesByAuthor(monthEntries));
        setWeekMinutes(sumMinutesByAuthor(weekEntries));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [supabase, companyId, monthFrom, monthTo]);

  const rows = useMemo(
    () =>
      workers.map((worker) => ({
        worker,
        monthMinutes: monthMinutes.get(worker.id) ?? 0,
        weekMinutes: weekMinutes.get(worker.id) ?? 0,
      })),
    [workers, monthMinutes, weekMinutes],
  );

  const openWorker = (workerId: string) => {
    setOpenWorkerId(workerId);
    setIsOpenLoading(true);

    getEntriesFeed(supabase, workerId)
      .then(async (entries) => {
        const paths = entries
          .map((entry) => entry.entry_photos[0]?.storage_path)
          .filter((path): path is string => Boolean(path));
        const urls = await getSignedPhotoUrls(supabase, paths);

        setOpenEntries(entries);
        setOpenThumbUrls(Object.fromEntries(urls));
      })
      .finally(() => setIsOpenLoading(false));
  };

  const monthTitle = `${t.months.nominative[month.getMonth()]} ${month.getFullYear()}`;

  if (openWorkerId) {
    const worker = workers.find((item) => item.id === openWorkerId);

    return (
      <div>
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setOpenWorkerId(null)}
            className="flex items-center gap-1 text-[15px] font-bold text-text-muted hover:text-text"
          >
            <ChevronLeft className="size-5" strokeWidth={2.4} aria-hidden />
            {t.reports.team.back}
          </button>

          <ExportMenu from={monthFrom} to={monthTo} workerId={openWorkerId} />
        </div>

        <p className="mt-3 text-[26px] font-extrabold tracking-tight">
          {worker?.full_name}
        </p>

        <div className="mt-4 max-w-[640px]">
          {isOpenLoading ? null : (
            <ReportsFeed entries={openEntries} sites={sites} thumbUrls={openThumbUrls} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[26px] font-extrabold tracking-tight">{t.admin.nav.team}</h1>

        <div className="flex items-center gap-2">
          <ExportMenu from={monthFrom} to={monthTo} />

          <button
            type="button"
            onClick={() => setIsAddOpen((open) => !open)}
            className={cn(
              "flex h-10 items-center gap-2 rounded-[12px] bg-brand px-4",
              "text-[14px] font-bold text-brand-ink",
              "transition-transform duration-150 active:scale-[0.98]",
            )}
          >
            <UserPlus className="size-[16px]" strokeWidth={2.2} aria-hidden />
            {t.reports.team.addWorker}
          </button>
        </div>
      </div>

      <PeriodNavigator
        className="mt-4 max-w-[360px]"
        title={monthTitle}
        onPrev={() => setMonth((current) => addMonthsSafe(current, -1))}
        onNext={() => setMonth((current) => addMonthsSafe(current, 1))}
      />

      {isAddOpen && (
        <AddWorkerForm
          className="mt-4 max-w-[480px]"
          onClose={() => setIsAddOpen(false)}
          onCreated={refreshWorkers}
        />
      )}

      {rows.length === 0 ? (
        <EmptyState className="mt-6" title={t.reports.team.empty} />
      ) : (
        <div className="mt-5 overflow-x-auto rounded-[16px] border border-border bg-surface">
          <table className="w-full min-w-[560px] border-collapse text-left text-[14px]">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="px-4 py-3 font-medium">{t.admin.reports.columnWorker}</th>
                <th className="px-4 py-3 font-medium">{t.hours.tabs.week}</th>
                <th className="px-4 py-3 font-medium">{t.hours.tabs.month}</th>
              </tr>
            </thead>

            <tbody>
              {rows.map(({ worker, monthMinutes: workerMonthMinutes, weekMinutes: workerWeekMinutes }) => (
                <tr
                  key={worker.id}
                  onClick={() => openWorker(worker.id)}
                  className="cursor-pointer border-b border-border last:border-b-0 hover:bg-surface-2"
                >
                  <td className="px-4 py-3 font-bold">{worker.full_name}</td>
                  <td className="tabular px-4 py-3 text-text-muted">
                    {formatHoursShort(workerWeekMinutes)}
                  </td>
                  <td className="tabular px-4 py-3 font-bold">
                    {formatHoursShort(workerMonthMinutes)}
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

function addMonthsSafe(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}
