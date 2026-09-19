"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, startOfMonth } from "date-fns";
import { uk as ukLocale } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, Share2 } from "lucide-react";

import { DayActions } from "@/components/hours/DayActions";
import { MonthEntriesTable } from "@/components/hours/MonthEntriesTable";
import { PeriodView } from "@/components/hours/PeriodView";
import { SalaryCalculator } from "@/components/hours/SalaryCalculator";
import { ALL_FILTER, HoursFilters } from "@/components/hours/HoursFilters";
import { useOpenShift } from "@/components/layout/ShiftContext";
import { AvatarLink } from "@/components/layout/AvatarLink";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { TeamExportSheet } from "@/components/reports/TeamExportSheet";
import type { ExportKind } from "@/modules/export/formats";
import { SegmentedTabs } from "@/components/shared/SegmentedTabs";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { t } from "@/lib/i18n";
import { hoursStrings as s } from "@/lib/i18n/parts/hours";
import { createClient } from "@/lib/supabase/client";
import { getAllSites, type Site } from "@/modules/sites/queries";
import { getCompanyWorkers, type Worker } from "@/modules/team/queries";
import { initialsOf, type Profile } from "@/modules/auth/profile";
import { getCompanyEntriesInRange } from "@/modules/entries/queries";
import { buildPeriodSummary, type DaySlot } from "@/modules/entries/period";
import type { WorkEntryWithNames } from "@/modules/entries/types";
import { dateKeyOf } from "@/modules/time/calc";
import { cn } from "@/lib/utils";

/** Заголовок навигатора: месяц з роком. */
function getMonthTitle(date: Date): string {
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
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  // Та сама відкрита зміна, що й на «Головній» і в листі «+» — з `ShiftProvider`.
  const openEntry = useOpenShift();

  const isBoss = profile.role === "boss";

  const [date, setDate] = useState<Date>(() => new Date(`${initialDate}T00:00:00`));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const [monthEntries, setMonthEntries] = useState<readonly WorkEntryWithNames[]>([]);
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

    getCompanyWorkers(supabase, profile.company_id)
      .then((data) => {
        if (!cancelled) setWorkers(data);
      })
      .catch(() => {});
    getAllSites(supabase)
      .then((data) => {
        if (!cancelled) setSites(data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isBoss, supabase, profile.company_id]);

  const todayKey = dateKeyOf(new Date());
  const isToday = dateKeyOf(date) === todayKey;

  // Таблица «Зміни за місяць» внизу екрана — всегда за месяц выбранной даты.
  useEffect(() => {
    let cancelled = false;
    const from = dateKeyOf(startOfMonth(date));
    const to = dateKeyOf(endOfMonth(date));

    getCompanyEntriesInRange(supabase, profile.company_id, from, to)
      .then((entries) => {
        if (!cancelled) setMonthEntries(entries);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [supabase, profile.company_id, date, refreshToken, openEntry?.id]);

  const visibleEntries = useMemo(() => {
    if (!isBoss) return monthEntries;
    if (scope === "self") return monthEntries.filter((entry) => entry.author_id === profile.id);

    return monthEntries.filter((entry) => {
      if (workerFilter !== ALL_FILTER && entry.author_id !== workerFilter) return false;
      if (siteFilter !== ALL_FILTER && entry.site_id !== siteFilter) return false;
      return true;
    });
  }, [isBoss, scope, monthEntries, workerFilter, siteFilter, profile.id]);
  const isFiltered = isTeamView && (workerFilter !== ALL_FILTER || siteFilter !== ALL_FILTER);

  const handleChanged = useCallback(() => {
    setRefreshToken((token) => token + 1);
    router.refresh();
  }, [router]);

  const shiftMonth = (direction: 1 | -1) => {
    setDate((current) => addMonths(current, direction));
  };

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
      getMonthTitle(date),
      workDays * profile.daily_norm_minutes,
      slots,
      monthEntries,
    );
  }, [date, isBoss, monthEntries, profile.daily_norm_minutes]);

  return (
    <div className="pb-6">
      <ScreenHeader
        title={t.hours.title}
        action={<AvatarLink initials={initialsOf(profile)} />}
      />

      <div className="px-4 pb-4">
        <div
          className={cn(
            "flex items-center gap-0.5 rounded-full border border-border",
            "bg-surface-2 p-1",
          )}
        >
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label={t.hours.prevPeriod}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full text-text",
              "transition-colors duration-150 active:bg-surface",
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
            )}
          >
            <ChevronLeft className="size-4" strokeWidth={2.4} aria-hidden />
          </button>

          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={t.hours.pickDate}
                className={cn(
                  "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-surface px-3",
                  "text-[13px] font-bold text-text",
                  "transition-transform duration-150 active:scale-95",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                )}
              >
                <CalendarDays
                  className="size-4 shrink-0 text-brand"
                  strokeWidth={2}
                  aria-hidden
                />
                <span className="whitespace-nowrap">{getMonthTitle(date)}</span>
              </button>
            </PopoverTrigger>

            <PopoverContent
              align="center"
              className="w-auto border border-border bg-surface p-2"
            >
              <Calendar
                mode="single"
                selected={date}
                defaultMonth={date}
                onSelect={(next) => {
                  if (next) {
                    setDate(next);
                    setIsCalendarOpen(false);
                  }
                }}
                locale={ukLocale}
              />
            </PopoverContent>
          </Popover>

          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label={t.hours.nextPeriod}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full text-text",
              "transition-colors duration-150 active:bg-surface",
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
            )}
          >
            <ChevronRight className="size-4" strokeWidth={2.4} aria-hidden />
          </button>
        </div>
      </div>

      {isBoss && (
        <div className="flex flex-col gap-3 px-4 pb-4 lg:flex-row lg:items-end lg:gap-4">
          <SegmentedTabs
            label={s.scopeLabel}
            value={scope}
            onChange={setScope}
            options={[
              { value: "team", label: s.scopeTeam },
              { value: "self", label: s.scopeSelf },
            ]}
            className="lg:mx-0 lg:overflow-visible lg:px-0"
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
              <button
                type="button"
                onClick={() => {
                  setExportIds(workerFilter !== ALL_FILTER ? [workerFilter] : []);
                  setIsExportOpen(true);
                }}
                className={cn(
                  "flex h-10 items-center justify-center gap-2 rounded-[12px] border border-border px-4",
                  "text-[14px] font-bold text-text transition-transform duration-150 active:scale-[0.98]",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand lg:ml-auto",
                )}
              >
                <Share2 className="size-4" strokeWidth={2.2} aria-hidden />
                {t.export.label}
              </button>
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
          periodLabel={getMonthTitle(date)}
          workers={workers.map((worker) => ({ id: worker.id, name: worker.full_name }))}
          workerIds={exportIds}
          onWorkerIdsChange={setExportIds}
          kind={exportKind}
          onKindChange={setExportKind}
        />
      )}

      <div className="px-4 lg:hidden">
        {isToday && (
          <DayActions
            openEntry={openEntry}
            onChanged={handleChanged}
          />
        )}

        {/* Тільки сума годин рабочего; норма/дні/графік — у дашборді шефа. */}
        {monthSummary && (
          <PeriodView className="mt-3" summary={monthSummary} variant="totalOnly" />
        )}

        <SalaryCalculator
          key={String(isTeamView)}
          className="mt-3"
          monthTitle={getMonthTitle(date)}
          selfId={profile.id}
          isBoss={isTeamView}
          companyId={profile.company_id}
          monthEntries={visibleEntries}
        />

        <MonthEntriesTable
          className="mt-3"
          entries={visibleEntries}
          showAuthor={isTeamView}
          isFiltered={isFiltered}
          onChanged={handleChanged}
        />
      </div>

      {/* Десктоп: керування вузькою колонкою зліва (кнопки не розтягуються
          на всю ширину), таблиця змін — ширшою колонкою справа. */}
      <div className="hidden px-4 lg:grid lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-6">
        <div className="flex flex-col gap-3">
          {isToday && (
            <DayActions
              openEntry={openEntry}
              onChanged={handleChanged}
            />
          )}

          {monthSummary && <PeriodView summary={monthSummary} variant="totalOnly" />}

          <SalaryCalculator
          key={String(isTeamView)}
            monthTitle={getMonthTitle(date)}
            selfId={profile.id}
            isBoss={isTeamView}
            companyId={profile.company_id}
            monthEntries={visibleEntries}
          />
        </div>

        <MonthEntriesTable
          entries={visibleEntries}
          showAuthor={isTeamView}
          isFiltered={isFiltered}
          onChanged={handleChanged}
        />
      </div>
    </div>
  );
}
