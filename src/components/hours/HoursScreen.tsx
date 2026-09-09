"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { uk as ukLocale } from "date-fns/locale";
import { CalendarDays } from "lucide-react";

import { DayActions } from "@/components/hours/DayActions";
import { DayDetailsCard } from "@/components/hours/DayDetailsCard";
import { DayEntriesCard } from "@/components/hours/DayEntriesCard";
import { DaySummaryCard } from "@/components/hours/DaySummaryCard";
import { PeriodNavigator } from "@/components/hours/PeriodNavigator";
import { PeriodView } from "@/components/hours/PeriodView";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import {
  SegmentedTabs,
  type SegmentedOption,
} from "@/components/shared/SegmentedTabs";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDateFull, formatDayMonth } from "@/lib/format";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/modules/auth/session";
import { getEntriesForDate, getEntriesInRange, getOpenEntry } from "@/modules/entries/queries";
import { aggregateDay, buildPeriodSummary, type DaySlot } from "@/modules/entries/period";
import type { WorkEntry } from "@/modules/entries/types";
import type { Site } from "@/modules/sites/queries";
import { dateKeyOf } from "@/modules/time/calc";
import { cn } from "@/lib/utils";

type Period = "day" | "week" | "month";

const PERIOD_OPTIONS: readonly SegmentedOption<Period>[] = [
  { value: "day", label: t.hours.tabs.day },
  { value: "week", label: t.hours.tabs.week },
  { value: "month", label: t.hours.tabs.month },
];

/** Заголовок навигатора: день, диапазон недели или месяц с годом. */
function getPeriodTitle(period: Period, date: Date): string {
  if (period === "day") {
    return formatDateFull(date);
  }

  if (period === "week") {
    const from = startOfWeek(date, { locale: ukLocale });
    const to = endOfWeek(date, { locale: ukLocale });

    return `${formatDayMonth(from)} — ${formatDayMonth(to)}`;
  }

  return `${t.months.nominative[date.getMonth()]} ${date.getFullYear()}`;
}

interface HoursScreenProps {
  profile: Profile;
  sites: readonly Site[];
  /** Сегодняшняя дата и данные по ней — с сервера, чтобы первый экран не мигал пустотой. */
  initialDate: string;
  initialEntries: readonly WorkEntry[];
  initialOpenEntry: WorkEntry | null;
}

/**
 * Экран «Години». Данные читает браузерный клиент Supabase при каждой смене
 * периода/даты — офлайн-кеша (модуль `sync`) пока нет, это этап 5.
 */
export function HoursScreen({
  profile,
  sites,
  initialDate,
  initialEntries,
  initialOpenEntry,
}: HoursScreenProps) {
  const supabase = useMemo(() => createClient(), []);
  const siteNameById = useMemo(
    () => new Map(sites.map((site) => [site.id, site.name] as const)),
    [sites],
  );

  const [period, setPeriod] = useState<Period>("day");
  const [date, setDate] = useState<Date>(() => new Date(`${initialDate}T00:00:00`));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const [dayEntries, setDayEntries] = useState<readonly WorkEntry[]>(initialEntries);
  const [rangeEntries, setRangeEntries] = useState<readonly WorkEntry[]>([]);
  const [openEntry, setOpenEntry] = useState<WorkEntry | null>(initialOpenEntry);
  const [refreshToken, setRefreshToken] = useState(0);

  // Таймер большой цифры на «Дне» тикает раз в секунду, но только пока
  // вкладка открыта — иначе смысла в интервале нет.
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (period !== "day") return;

    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [period]);

  const todayKey = dateKeyOf(new Date());
  const isToday = dateKeyOf(date) === todayKey;

  // Открытую смену держим отдельно от «дня»: она может быть заведена под
  // вчерашней датой (ночная смена, ещё не завершена) и не попасть в список
  // записей за сегодня, но кнопки на этом экране всё равно должны её видеть.
  useEffect(() => {
    let cancelled = false;

    getOpenEntry(supabase, profile.id)
      .then((entry) => {
        if (!cancelled) setOpenEntry(entry);
      })
      .catch(() => {
        // Сеть моргнула — старое значение openEntry остаётся на экране.
      });

    return () => {
      cancelled = true;
    };
  }, [supabase, profile.id, refreshToken]);

  useEffect(() => {
    let cancelled = false;
    const key = dateKeyOf(date);

    if (period === "day") {
      getEntriesForDate(supabase, profile.id, key)
        .then((entries) => {
          if (!cancelled) setDayEntries(entries);
        })
        .catch(() => {});

      return () => {
        cancelled = true;
      };
    }

    const from = period === "week" ? startOfWeek(date, { locale: ukLocale }) : startOfMonth(date);
    const to = period === "week" ? endOfWeek(date, { locale: ukLocale }) : endOfMonth(date);

    getEntriesInRange(supabase, profile.id, dateKeyOf(from), dateKeyOf(to))
      .then((entries) => {
        if (!cancelled) setRangeEntries(entries);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [supabase, profile.id, period, date, refreshToken]);

  const handleChanged = useCallback(() => {
    setRefreshToken((token) => token + 1);
  }, []);

  const shiftPeriod = (direction: 1 | -1) => {
    setDate((current) => {
      if (period === "day") return addDays(current, direction);
      return period === "week" ? addWeeks(current, direction) : addMonths(current, direction);
    });
  };

  const dayAggregate = useMemo(
    () => aggregateDay(dayEntries, now),
    [dayEntries, now],
  );

  const weekSummary = useMemo(() => {
    if (period !== "week") return null;

    const from = startOfWeek(date, { locale: ukLocale });
    const days = eachDayOfInterval({ start: from, end: endOfWeek(date, { locale: ukLocale }) });
    const slots: DaySlot[] = days.map((day) => ({
      date: dateKeyOf(day),
      label: t.weekdays.short[day.getDay()],
      isOffDay: day.getDay() === 0 || day.getDay() === 6,
    }));

    return buildPeriodSummary(
      getPeriodTitle("week", date),
      5 * profile.daily_norm_minutes,
      slots,
      rangeEntries,
    );
  }, [period, date, rangeEntries, profile.daily_norm_minutes]);

  const monthSummary = useMemo(() => {
    if (period !== "month") return null;

    const from = startOfMonth(date);
    const days = eachDayOfInterval({ start: from, end: endOfMonth(date) });
    const slots: DaySlot[] = days.map((day) => ({
      date: dateKeyOf(day),
      label: String(day.getDate()).padStart(2, "0"),
      isOffDay: day.getDay() === 0 || day.getDay() === 6,
    }));
    const workDays = days.filter((day) => day.getDay() !== 0 && day.getDay() !== 6).length;

    return buildPeriodSummary(
      getPeriodTitle("month", date),
      workDays * profile.daily_norm_minutes,
      slots,
      rangeEntries,
    );
  }, [period, date, rangeEntries, profile.daily_norm_minutes]);

  return (
    <div className="pb-6">
      <ScreenHeader
        title={t.hours.title}
        action={
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={t.hours.pickDate}
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-full",
                  "border border-border bg-surface-2 text-text",
                  "transition-transform duration-150 active:scale-95",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                )}
              >
                <CalendarDays className="size-5" strokeWidth={2} aria-hidden />
              </button>
            </PopoverTrigger>

            <PopoverContent
              align="end"
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
        }
      />

      <div className="px-4">
        <SegmentedTabs
          options={PERIOD_OPTIONS}
          value={period}
          onChange={setPeriod}
          label={t.hours.title}
        />

        {period === "day" && isToday && (
          <DayActions
            className="mt-3"
            openEntry={openEntry}
            onChanged={handleChanged}
          />
        )}

        <PeriodNavigator
          className="mt-3"
          title={getPeriodTitle(period, date)}
          onPrev={() => shiftPeriod(-1)}
          onNext={() => shiftPeriod(1)}
        />

        {period === "day" && (
          <div className="mt-3 space-y-3">
            <DaySummaryCard aggregate={dayAggregate} />
            <DayEntriesCard entries={dayEntries} siteNameById={siteNameById} now={now} />
            <DayDetailsCard
              aggregate={dayAggregate}
              entries={dayEntries}
              siteNameById={siteNameById}
            />
          </div>
        )}

        {period === "week" && weekSummary && (
          <PeriodView className="mt-3" summary={weekSummary} />
        )}

        {period === "month" && monthSummary && (
          <PeriodView className="mt-3" summary={monthSummary} labelEvery={5} />
        )}
      </div>
    </div>
  );
}
