"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { eachDayOfInterval, endOfMonth, startOfMonth } from "date-fns";
import { useRouter } from "next/navigation";
import { Clock, Route, Share2 } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";

import { AddTimeButton } from "@/components/hours/AddTimeButton";
import { MonthEntriesTable } from "@/components/hours/MonthEntriesTable";
import { PeriodView } from "@/components/hours/PeriodView";
import { SalaryLink } from "@/components/hours/SalaryLink";
import { TravelEntriesCard } from "@/components/hours/TravelEntriesCard";
import { ALL_FILTER, HoursFilters } from "@/components/hours/HoursFilters";
import { AvatarLink } from "@/components/layout/AvatarLink";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { TeamExportSheet } from "@/components/reports/TeamExportSheet";
import type { ExportKind } from "@/modules/export/formats";
import { MonthNavigator } from "@/components/shared/MonthNavigator";
import type { Dict } from "@/lib/i18n";
import { activeDay, matchesDay } from "@/lib/dayFilter";
import { fmt, formatDayMonth } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";
import { loadWithCache } from "@/lib/offline/cache";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { getTravelEntriesInRange, type TravelEntryWithNames } from "@/modules/travel/queries";
import { getAllSites, type Site } from "@/modules/sites/queries";
import { getCompanyWorkers, type Worker } from "@/modules/team/queries";
import { initialsOf } from "@/components/shared/Thumb";
import type { Profile } from "@/modules/auth/profile";
import { getCompanyEntriesInRange } from "@/modules/entries/queries";
import { buildPeriodSummary, type DaySlot } from "@/modules/entries/period";
import { EMPTY_FILTER_STAT, tallyEntries } from "@/modules/entries/filterStats";
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
  const locale = useLocale();
  const s = t.hoursUi;
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const isBoss = profile.role === "boss";

  const [date, setDate] = useState<Date>(() => new Date(`${initialDate}T00:00:00`));
  // День, выбранный в календаре: показываем только его; «✕» рядом с календарём возвращает месяц.
  const [day, setDay] = useState<Date | null>(null);
  const selectedDay = activeDay(day, date);

  const [monthEntries, setMonthEntries] = useState<readonly WorkEntryWithNames[]>([]);
  const [travelEntries, setTravelEntries] = useState<readonly TravelEntryWithNames[]>([]);
  const [loadedMonthKey, setLoadedMonthKey] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  // Шеф: фільтри по співробітнику й об'єкту (себе він обирає в списку співробітників).
  const [showTravel, setShowTravel] = useState(false);
  const [workerFilter, setWorkerFilter] = useState(ALL_FILTER);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportKind, setExportKind] = useState<ExportKind>("hours");
  const [exportIds, setExportIds] = useState<string[]>([]);
  const [siteFilter, setSiteFilter] = useState(ALL_FILTER);
  const [workers, setWorkers] = useState<readonly Worker[]>([]);
  const [sites, setSites] = useState<readonly Site[]>([]);
  const isTeamView = isBoss;

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

    // Дорога на объекты за месяц — отдельный блок, в часы не входит. Нет таблицы в базе — просто пусто.
    loadWithCache({
      key: `${profile.id}:travel:${from}:${to}`,
      fetcher: () => getTravelEntriesInRange(supabase, profile.company_id, from, to),
      onData: (data) => setTravelEntries(data),
      isCancelled: () => cancelled,
    }).catch(() => {});

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

  // Записи выбранного дня (дня нет — всего месяца): от них считаются и список, и цифры в фильтрах.
  const dayEntries = useMemo(
    () => (selectedDay ? monthEntries.filter((entry) => matchesDay(entry.work_date, selectedDay)) : monthEntries),
    [monthEntries, selectedDay],
  );
  const dayTravel = useMemo(
    () => (selectedDay ? travelEntries.filter((entry) => matchesDay(entry.work_date, selectedDay)) : travelEntries),
    [travelEntries, selectedDay],
  );

  const visibleEntries = useMemo(() => {
    if (!isBoss) return dayEntries;

    return dayEntries.filter((entry) => {
      if (workerFilter !== ALL_FILTER && entry.author_id !== workerFilter) return false;
      if (siteFilter !== ALL_FILTER && entry.site_id !== siteFilter) return false;
      return true;
    });
  }, [isBoss, dayEntries, workerFilter, siteFilter]);

  // Точки в календаре: дни, где есть то, что сейчас показывает список (смены или дорога), с теми же фильтрами.
  const markedDays = useMemo(() => {
    const rows: readonly { work_date: string; author_id: string; site_id: string | null }[] = showTravel
      ? travelEntries
      : monthEntries;

    return [
      ...new Set(
        rows
          .filter((entry) => {
            if (!isBoss) return true;
            if (workerFilter !== ALL_FILTER && entry.author_id !== workerFilter) return false;
            if (siteFilter !== ALL_FILTER && entry.site_id !== siteFilter) return false;
            return true;
          })
          .map((entry) => entry.work_date),
      ),
    ];
  }, [showTravel, travelEntries, monthEntries, isBoss, workerFilter, siteFilter]);
  // Дорога — с теми же фильтрами, что и смены: рабочему — своя, шефу — по фильтрам.
  const visibleTravel = useMemo(() => {
    if (!isBoss) return dayTravel;

    return dayTravel.filter((entry) => {
      if (workerFilter !== ALL_FILTER && entry.author_id !== workerFilter) return false;
      if (siteFilter !== ALL_FILTER && entry.site_id !== siteFilter) return false;
      return true;
    });
  }, [isBoss, dayTravel, workerFilter, siteFilter]);
  const isFiltered = isTeamView && (workerFilter !== ALL_FILTER || siteFilter !== ALL_FILTER);

  // Підписи в списках фільтрів: скільки змін і годин зараз дадуть сам по собі співробітник чи об'єкт
  // (з урахуванням другого фільтра, щоб цифри збігалися з тим, що побачить шеф після вибору).
  const workerStats = useMemo(
    () =>
      tallyEntries(
        dayEntries.filter((entry) => siteFilter === ALL_FILTER || entry.site_id === siteFilter),
        (entry) => entry.author_id,
      ),
    [dayEntries, siteFilter],
  );
  const siteStats = useMemo(
    () =>
      tallyEntries(
        dayEntries.filter((entry) => workerFilter === ALL_FILTER || entry.author_id === workerFilter),
        (entry) => entry.site_id,
      ),
    [dayEntries, workerFilter],
  );

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

  // Шеф: к двум кнопкам добавляется квадратный экспорт — всё в один ряд.
  const hasExport = isTeamView;
  const openExport = () => {
    setExportIds(workerFilter !== ALL_FILTER ? [workerFilter] : []);
    setIsExportOpen(true);
  };

  // Калькулятор, переключатель «Робочий час / Час у дорозі» и (шефу) экспорт — одним рядом.
  const actionsRow = (
    <div className={cn("grid gap-2", hasExport ? "grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" : "grid-cols-2")}>
      <SalaryLink month={date} />
      <Button
        variant="outline"
        size="wrap"
        block
        aria-pressed={showTravel}
        onClick={() => setShowTravel((value) => !value)}
      >
        {showTravel ? (
          <Clock className="size-4 shrink-0" strokeWidth={1.9} aria-hidden />
        ) : (
          <Route className="size-4 shrink-0" strokeWidth={1.9} aria-hidden />
        )}
        {showTravel ? s.showWork : s.showTravel}
      </Button>
      {hasExport && (
        <Button variant="outline" size="icon-lg" onClick={openExport} aria-label={t.reportsUi.export.open}>
          <Share2 className="size-5" strokeWidth={1.9} aria-hidden />
        </Button>
      )}
    </div>
  );

  // Список под фильтрами: смены или дорога; в выбранном дне пусто — подсказка и возврат к месяцу.
  const renderList = (className?: string) => {
    if (showTravel) {
      return (
        <TravelEntriesCard
          className={className}
          entries={visibleTravel}
          showAuthor={isTeamView}
          onChanged={handleChanged}
          showEmpty
        />
      );
    }

    if (selectedDay && !isFiltered && !isEntriesLoading && visibleEntries.length === 0) {
      return (
        <EmptyState
          className={className}
          title={fmt(s.emptyDayTitle, { day: formatDayMonth(selectedDay, locale) })}
          action={
            <Button variant="outline" size="sm" onClick={() => setDay(null)}>
              {t.hours.showWholeMonth}
            </Button>
          }
        />
      );
    }

    return (
      <MonthEntriesTable
        className={className}
        entries={visibleEntries}
        showAuthor={isTeamView}
        isFiltered={isFiltered}
        isLoading={isEntriesLoading}
        title={selectedDay ? s.dayTableTitle : undefined}
        onChanged={handleChanged}
      />
    );
  };

  return (
    <div className="pb-6">
      <ScreenHeader
        title={t.hours.title}
        action={
          <div className="flex items-center gap-2">
            <AddTimeButton compact />
            <AvatarLink initials={initialsOf(profile.full_name)} className="hidden lg:block" />
          </div>
        }
      />

      <MonthNavigator
        className="px-4 pb-3 lg:px-0"
        date={date}
        onChange={setDate}
        day={selectedDay}
        onDayChange={setDay}
        markedDays={markedDays}
      />

      {isBoss && (
        <div className="px-4 pb-3 lg:px-0">
          <HoursFilters
            className="lg:w-[460px]"
            workers={workers.map((w) => ({
              id: w.id,
              name: w.full_name,
              ...(workerStats.byKey.get(w.id) ?? EMPTY_FILTER_STAT),
            }))}
            sites={sites.map((site) => ({
              id: site.id,
              name: site.name,
              ...(siteStats.byKey.get(site.id) ?? EMPTY_FILTER_STAT),
            }))}
            workersTotal={workerStats.total}
            sitesTotal={siteStats.total}
            workerId={workerFilter}
            siteId={siteFilter}
            onWorkerChange={setWorkerFilter}
            onSiteChange={setSiteFilter}
          />
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
        {/* Тільки сума годин рабочего; норма/дні/графік — у дашборді шефа. */}
        {monthSummary && (
          <PeriodView summary={monthSummary} />
        )}

        <div className="mt-3">{actionsRow}</div>

        {renderList("mt-3")}
      </div>

      {/* Десктоп: таблиця змін — на всю ширину зліва, праворуч панель 320 px
          з діями дня, сумою та калькулятором. */}
      <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6">
        <div className="flex flex-col gap-3">
          {renderList()}
        </div>

        <div className="flex flex-col gap-3">
          {monthSummary && <PeriodView summary={monthSummary} />}

          {actionsRow}
        </div>
      </div>
    </div>
  );
}
