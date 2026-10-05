"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { eachDayOfInterval, endOfMonth, startOfMonth } from "date-fns";
import { useRouter } from "next/navigation";
import { Share2 } from "lucide-react";

import { AddTimeButton } from "@/components/hours/AddTimeButton";
import { MonthEntriesTable } from "@/components/hours/MonthEntriesTable";
import { PeriodView } from "@/components/hours/PeriodView";
import { SalaryCalculator } from "@/components/hours/SalaryCalculator";
import { ALL_FILTER, HoursFilters } from "@/components/hours/HoursFilters";
import { AvatarLink } from "@/components/layout/AvatarLink";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { TeamExportSheet } from "@/components/reports/TeamExportSheet";
import type { ExportKind } from "@/modules/export/formats";
import { MonthNavigator } from "@/components/shared/MonthNavigator";
import { SegmentedTabs } from "@/components/shared/SegmentedTabs";
import type { Dict } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { loadWithCache } from "@/lib/offline/cache";
import { createClient } from "@/lib/supabase/client";
import { getAllSites, type Site } from "@/modules/sites/queries";
import { getCompanyWorkers, type Worker } from "@/modules/team/queries";
import { initialsOf } from "@/components/shared/Thumb";
import type { Profile } from "@/modules/auth/profile";
import { getCompanyEntriesInRange } from "@/modules/entries/queries";
import { buildPeriodSummary, type DaySlot } from "@/modules/entries/period";
import type { WorkEntryWithNames } from "@/modules/entries/types";
import { dateKeyOf } from "@/modules/time/calc";
import { Button } from "@/components/ui/button";

/** Заголовок навигатора: месяц з роком. */
function getMonthTitle(date: Date, t: Dict): string {
  return `${t.months.nominative[date.getMonth()]} ${date.getFullYear()}`;
}

interface HoursScreenProps {
  profile: Profile;
  /** Сегодняшняя дата — с сервера, чтобы первый экран не мигал пустотой. */
  initialDate: string;
}

/**
 * Экран «Години». Показывает только зведення за місяць — вкладок День/Тиждень
 * немає, перемикання періодів прибрали, залишили лише навігацію по місяцях.
 * Дані читає браузерний клиент Supabase при каждой смене даты — офлайн-кеша
 * (модуль `sync`) пока нет, это этап 5.
 */
export function HoursScreen({
  profile,
  initialDate,
}: HoursScreenProps) {
  const t = useT();
  const s = t.hoursUi;
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const isBoss = profile.role === "boss";

  const [date, setDate] = useState<Date>(() => new Date(`${initialDate}T00:00:00`));

  const [monthEntries, setMonthEntries] = useState<readonly WorkEntryWithNames[]>([]);
  const [loadedMonthKey, setLoadedMonthKey] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  // Шеф: «Я / Команда» + фільтри по співробітнику й об'єкту.
  const [scope, setScope] = useState<"self" | "team">("team");
  const [workerFilter, setWorkerFilter] = useState(ALL_FILTER);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportKind, setExportKind] = useState<ExportKind>("hours");
  const [exportIds, setExportIds] = useState<string[]>([]);
  const [siteFilter, setSiteFilter] = useState(ALL_FILTER);
  const [workers, setWorkers] = useState<readonly Worker[]>([]);
  const [sites, setSites] = useState<readonly Site[]>([]);
  const isTeamView = isBoss && scope === "team";

  useEffect(() => {
    if (!isBoss) return;
    let cancelled = false;

    loadWithCache({
      key: `${profile.id}:workers`,
      fetcher: () => getCompanyWorkers(supabase, profile.company_id),
      onData: (data) => setWorkers(data),
      isCancelled: () => cancelled,
    }).catch(() => {});
    loadWithCache({
      key: `${profile.id}:sites:all`,
      fetcher: () => getAllSites(supabase),
      onData: (data) => setSites(data),
      isCancelled: () => cancelled,
    }).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isBoss, supabase, profile.company_id, profile.id]);

  // Таблица «Зміни за місяць» внизу екрана — всегда за месяц выбранной даты.
  useEffect(() => {
    let cancelled = false;
    const from = dateKeyOf(startOfMonth(date));
    const to = dateKeyOf(endOfMonth(date));

    // Сначала последние сохранённые на телефоне записи месяца, затем свежие.
    loadWithCache({
      key: `${profile.id}:entries:${from}:${to}`,
      fetcher: () => getCompanyEntriesInRange(supabase, profile.company_id, from, to),
      onData: (entries) => {
        setMonthEntries(entries);
        setLoadedMonthKey(from);
      },
      isCancelled: () => cancelled,
    }).catch(() => {
      if (!cancelled) setLoadedMonthKey(from);
    });

    return () => {
      cancelled = true;
    };
  }, [supabase, profile.company_id, profile.id, date, refreshToken]);

  const isEntriesLoading = loadedMonthKey !== dateKeyOf(startOfMonth(date));

  const visibleEntries = useMemo(() => {
    if (!isBoss) return monthEntries;
    if (scope === "self") return monthEntries.filter((entry) => entry.author_id === profile.id);

    return monthEntries.filter((entry) => {
      if (workerFilter !== ALL_FILTER && entry.author_id !== workerFilter) return false;
      if (siteFilter !== ALL_FILTER && entry.site_id !== siteFilter) return false;
      return true;
    });
  }, [isBoss, scope, monthEntries, workerFilter, siteFilter, profile.id]);
  // Калькулятор зарплаты выбирает сотрудников сам, поэтому ему нужны смены всех — отфильтрованные
  // только по объекту (а не по сотруднику, как список выше).
  const salaryEntries = useMemo(
    () =>
      isTeamView
        ? monthEntries.filter((entry) => siteFilter === ALL_FILTER || entry.site_id === siteFilter)
        : visibleEntries,
    [isTeamView, monthEntries, visibleEntries, siteFilter],
  );
  const salaryWorkers = useMemo(
    () => workers.map((worker) => ({ id: worker.id, name: worker.full_name })),
    [workers],
  );
  const isFiltered = isTeamView && (workerFilter !== ALL_FILTER || siteFilter !== ALL_FILTER);

  const handleChanged = useCallback(() => {
    setRefreshToken((token) => token + 1);
    router.refresh();
  }, [router]);

  // Статистика норми/графіка показується тільки рабочому і завжди про
  // нього самого — RLS вже віддає йому лише власні записи в monthEntries.
  const monthSummary = useMemo(() => {
    if (isBoss) return null;

    const from = startOfMonth(date);
    const days = eachDayOfInterval({ start: from, end: endOfMonth(date) });
    const slots: DaySlot[] = days.map((day) => ({
      date: dateKeyOf(day),
      label: String(day.getDate()).padStart(2, "0"),
      isOffDay: day.getDay() === 0 || day.getDay() === 6,
    }));
    const workDays = days.filter((day) => day.getDay() !== 0 && day.getDay() !== 6).length;

    return buildPeriodSummary(
      getMonthTitle(date, t),
      workDays * profile.daily_norm_minutes,
      slots,
      monthEntries,
    );
  }, [date, isBoss, monthEntries, profile.daily_norm_minutes, t]);

  return (
    <div className="pb-6">
      <ScreenHeader
        title={t.hours.title}
        action={<AvatarLink initials={initialsOf(profile.full_name)} />}
      />

      <MonthNavigator className="px-4 pb-3 lg:px-0" date={date} onChange={setDate} />

      {isBoss && (
        <div className="flex flex-col gap-3 px-4 pb-3 lg:flex-row lg:items-end lg:gap-4 lg:px-0">
          <SegmentedTabs
            label={s.scopeLabel}
            value={scope}
            onChange={setScope}
            options={[
              { value: "team", label: s.scopeTeam },
              { value: "self", label: s.scopeSelf },
            ]}
            className="lg:w-[260px]"
          />

          {isTeamView && (
            <>
              <HoursFilters
                className="lg:w-[460px]"
                workers={workers.map((w) => ({ id: w.id, name: w.full_name }))}
                sites={sites.map((site) => ({ id: site.id, name: site.name }))}
                workerId={workerFilter}
                siteId={siteFilter}
                onWorkerChange={setWorkerFilter}
                onSiteChange={setSiteFilter}
              />
              <Button variant="outline" size="sm" className="lg:ml-auto" onClick={() => { setExportIds(workerFilter !== ALL_FILTER ? [workerFilter] : []); setIsExportOpen(true); }}>
                <Share2 className="size-4" strokeWidth={1.9} aria-hidden />
                {t.export.label}
              </Button>
            </>
          )}
        </div>
      )}

      {isBoss && (
        <TeamExportSheet
          open={isExportOpen}
          onOpenChange={setIsExportOpen}
          from={dateKeyOf(startOfMonth(date))}
          to={dateKeyOf(endOfMonth(date))}
          periodLabel={getMonthTitle(date, t)}
          workers={workers.map((worker) => ({ id: worker.id, name: worker.full_name }))}
          workerIds={exportIds}
          onWorkerIdsChange={setExportIds}
          kind={exportKind}
          onKindChange={setExportKind}
        />
      )}

      <div className="px-4 lg:hidden">
        <AddTimeButton />

        {/* Тільки сума годин рабочего; норма/дні/графік — у дашборді шефа. */}
        {monthSummary && (
          <PeriodView className="mt-3" summary={monthSummary} />
        )}

        <SalaryCalculator
          key={String(isTeamView)}
          className="mt-3"
          month={date}
          selfId={profile.id}
          selfName={profile.full_name}
          isBoss={isTeamView}
          workers={salaryWorkers}
          monthEntries={salaryEntries}
        />

        <MonthEntriesTable
          className="mt-3"
          entries={visibleEntries}
          showAuthor={isTeamView}
          isFiltered={isFiltered}
          isLoading={isEntriesLoading}
          onChanged={handleChanged}
        />
      </div>

      {/* Десктоп: таблиця змін — на всю ширину зліва, праворуч панель 320 px
          з діями дня, сумою та калькулятором. */}
      <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6">
        <MonthEntriesTable
          entries={visibleEntries}
          showAuthor={isTeamView}
          isFiltered={isFiltered}
          isLoading={isEntriesLoading}
          onChanged={handleChanged}
        />

        <div className="flex flex-col gap-3">
          <AddTimeButton />

          {monthSummary && <PeriodView summary={monthSummary} />}

          <SalaryCalculator
            key={String(isTeamView)}
            month={date}
            selfId={profile.id}
            selfName={profile.full_name}
            isBoss={isTeamView}
            workers={salaryWorkers}
            monthEntries={salaryEntries}
          />
        </div>
      </div>
    </div>
  );
}
