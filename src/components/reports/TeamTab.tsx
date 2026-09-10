"use client";

import { useEffect, useMemo, useState } from "react";
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { uk as ukLocale } from "date-fns/locale";
import { ChevronLeft, Download } from "lucide-react";

import { ReportsFeed } from "@/components/reports/ReportsFeed";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  SegmentedTabs,
  type SegmentedOption,
} from "@/components/shared/SegmentedTabs";
import { PeriodNavigator } from "@/components/hours/PeriodNavigator";
import { fmt, formatHoursShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { getCompanyEntriesInRange, getEntriesFeed } from "@/modules/entries/queries";
import type { WorkEntryWithNames, WorkEntryWithPhotos } from "@/modules/entries/types";
import { getSignedPhotoUrls } from "@/modules/media/signedUrls";
import type { Site } from "@/modules/sites/queries";
import { getCompanyWorkers, type Worker } from "@/modules/team/queries";
import { dateKeyOf } from "@/modules/time/calc";
import { cn } from "@/lib/utils";

const WORKER_FILTER_ALL = "all";

function sumMinutesByAuthor(
  entries: readonly WorkEntryWithNames[],
): ReadonlyMap<string, number> {
  const map = new Map<string, number>();

  for (const entry of entries) {
    map.set(entry.author_id, (map.get(entry.author_id) ?? 0) + (entry.total_minutes ?? 0));
  }

  return map;
}

interface TeamTabProps {
  companyId: string;
  sites: readonly Site[];
}

/**
 * Вкладка «Команда» (REPORTS.md, розділ 4) — тільки boss. Список
 * працівників компанії з їхніми годинами за обраний місяць, фільтр по
 * одному працівнику, перехід у стрічку його звітів і кнопка експорту CSV.
 *
 * Хто саме бачить цю вкладку — вирішує `ReportsScreen` (перевіряє
 * `profile.role`), тут це вже не перевіряється повторно.
 */
export function TeamTab({ companyId, sites }: TeamTabProps) {
  const supabase = useMemo(() => createClient(), []);

  const [workers, setWorkers] = useState<readonly Worker[]>([]);
  const [month, setMonth] = useState(() => new Date());
  const [monthMinutes, setMonthMinutes] = useState<ReadonlyMap<string, number>>(new Map());
  const [weekMinutes, setWeekMinutes] = useState<ReadonlyMap<string, number>>(new Map());
  const [workerFilter, setWorkerFilter] = useState(WORKER_FILTER_ALL);

  const [openWorkerId, setOpenWorkerId] = useState<string | null>(null);
  const [openEntries, setOpenEntries] = useState<readonly WorkEntryWithPhotos[]>([]);
  const [openThumbUrls, setOpenThumbUrls] = useState<Readonly<Record<string, string>>>({});
  const [isOpenLoading, setIsOpenLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getCompanyWorkers(supabase, companyId)
      .then((data) => {
        if (!cancelled) setWorkers(data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [supabase, companyId]);

  useEffect(() => {
    let cancelled = false;
    const monthFrom = dateKeyOf(startOfMonth(month));
    const monthTo = dateKeyOf(endOfMonth(month));
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
  }, [supabase, companyId, month]);

  const workerOptions: readonly SegmentedOption<string>[] = useMemo(
    () => [
      { value: WORKER_FILTER_ALL, label: t.reports.team.allWorkers },
      ...workers.map((worker) => ({ value: worker.id, label: worker.full_name })),
    ],
    [workers],
  );

  const rows = useMemo(
    () =>
      (workerFilter === WORKER_FILTER_ALL
        ? workers
        : workers.filter((worker) => worker.id === workerFilter)
      ).map((worker) => ({
        worker,
        monthMinutes: monthMinutes.get(worker.id) ?? 0,
        weekMinutes: weekMinutes.get(worker.id) ?? 0,
      })),
    [workers, workerFilter, monthMinutes, weekMinutes],
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

  if (openWorkerId) {
    const worker = workers.find((item) => item.id === openWorkerId);

    return (
      <div>
        <div className="px-4 pb-1">
          <button
            type="button"
            onClick={() => setOpenWorkerId(null)}
            className="flex items-center gap-1 py-3 text-[15px] font-bold text-text-muted active:text-text"
          >
            <ChevronLeft className="size-5" strokeWidth={2.4} aria-hidden />
            {t.reports.team.back}
          </button>

          <p className="text-[22px] font-extrabold tracking-tight">
            {worker?.full_name}
          </p>
        </div>

        {isOpenLoading ? null : (
          <ReportsFeed entries={openEntries} sites={sites} thumbUrls={openThumbUrls} />
        )}
      </div>
    );
  }

  const monthTitle = `${t.months.nominative[month.getMonth()]} ${month.getFullYear()}`;
  const exportHref = `/api/export?from=${dateKeyOf(startOfMonth(month))}&to=${dateKeyOf(endOfMonth(month))}`;

  return (
    <div className="px-4">
      <PeriodNavigator
        title={monthTitle}
        onPrev={() => setMonth((current) => addMonthsSafe(current, -1))}
        onNext={() => setMonth((current) => addMonthsSafe(current, 1))}
      />

      <SegmentedTabs
        className="mt-3"
        options={workerOptions}
        value={workerFilter}
        onChange={setWorkerFilter}
        label={t.reports.team.allWorkers}
      />

      {rows.length === 0 ? (
        <EmptyState className="mt-6" title={t.reports.team.empty} />
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map(({ worker, monthMinutes: workerMonthMinutes, weekMinutes: workerWeekMinutes }) => (
            <li key={worker.id}>
              <button
                type="button"
                onClick={() => openWorker(worker.id)}
                className={cn(
                  "w-full rounded-[16px] border border-border bg-surface p-4 text-left",
                  "transition-transform duration-150 active:scale-[0.99]",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-[16px] font-bold">
                    {worker.full_name}
                  </p>
                  <p className="tabular shrink-0 text-[16px] font-bold">
                    {formatHoursShort(workerMonthMinutes)}
                  </p>
                </div>

                <p className="mt-1 text-[13px] font-medium text-text-muted">
                  {fmt(t.reports.team.thisWeek, {
                    hours: formatHoursShort(workerWeekMinutes),
                  })}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      <a
        href={exportHref}
        className={cn(
          "mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[14px]",
          "border border-border text-[15px] font-bold text-text",
          "transition-transform duration-150 active:scale-[0.98]",
        )}
      >
        <Download className="size-[18px]" strokeWidth={2} aria-hidden />
        {t.reports.team.export}
      </a>
    </div>
  );
}

function addMonthsSafe(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}
