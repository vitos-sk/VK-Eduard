"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LazyCalendar as Calendar, preloadCalendar } from "@/components/ui/lazy-calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Stepper } from "@/components/ui/stepper";
import type { Dict } from "@/lib/i18n";
import { activeDay, stepPeriod } from "@/lib/dayFilter";
import { formatDayMonthYear, fromDateKey } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";
import { DATE_FNS_LOCALES } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

/** «Жовтень 2026» — заголовок месяца в навигаторе. */
export function monthTitle(date: Date, t: Dict): string {
  return `${t.months.nominative[date.getMonth()]} ${date.getFullYear()}`;
}

interface MonthNavigatorProps {
  date: Date;
  onChange: (date: Date) => void;
  /**
   * Выбранный день внутри месяца. Задан вместе с `onDayChange` — навигатор умеет и дни: календарь
   * выбирает день, кнопка показывает его, стрелки листают по дням, а рядом появляется «✕» —
   * вернуть весь месяц. Без `onDayChange` календарь выбирает только месяц, как раньше.
   */
  day?: Date | null;
  onDayChange?: (day: Date | null) => void;
  /** Дни (`YYYY-MM-DD`), в которых есть записи: в календаре под числом ставится точка. Только вместе с `onDayChange`. */
  markedDays?: readonly string[];
  className?: string;
}

/**
 * Навигатор месяца: стрелка назад, кнопка с названием месяца (открывает календарь),
 * стрелка вперёд. Один и тот же вид на экранах «Години» и «Звіти».
 */
export function MonthNavigator({ date, onChange, day = null, onDayChange, markedDays, className }: MonthNavigatorProps) {
  const t = useT();
  const locale = useLocale();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const dayMode = onDayChange !== undefined;
  const selectedDay = dayMode ? activeDay(day, date) : null;
  const marked = useMemo(() => (markedDays ?? []).map(fromDateKey), [markedDays]);

  const step = (direction: -1 | 1) => {
    const next = stepPeriod(date, selectedDay, direction);

    onChange(next.month);
    if (selectedDay) onDayChange?.(next.day);
  };

  useEffect(() => {
    const id = window.setTimeout(preloadCalendar, 1500);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Stepper
        direction="earlier"
        label={t.hours.prevPeriod}
        onClick={() => step(-1)}
      />

      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="field"
            size="sm"
            aria-label={t.hours.pickDate}
            className="min-w-0 flex-1 border-edge"
          >
            <CalendarDays className="size-4 shrink-0 text-primary" strokeWidth={1.9} aria-hidden />
            <span className="whitespace-nowrap">
              {selectedDay ? formatDayMonthYear(selectedDay, locale) : monthTitle(date, t)}
            </span>
          </Button>
        </PopoverTrigger>

        <PopoverContent align="center" className="w-auto border border-edge bg-ticket p-2">
          <Calendar
            mode="single"
            selected={dayMode ? (selectedDay ?? undefined) : date}
            defaultMonth={selectedDay ?? date}
            modifiers={dayMode ? { marked } : undefined}
            onSelect={(next) => {
              if (!dayMode) {
                if (next) {
                  onChange(next);
                  setIsCalendarOpen(false);
                }

                return;
              }

              // Нажали на уже выбранный день — это «снять выбор».
              if (next) {
                onChange(next);
                onDayChange?.(next);
              } else {
                onDayChange?.(null);
              }

              setIsCalendarOpen(false);
            }}
            locale={DATE_FNS_LOCALES[locale]}
          />
        </PopoverContent>
      </Popover>

      {selectedDay && (
        <Button
          variant="outline"
          size="icon-sm"
          className="shrink-0"
          aria-label={t.hours.showWholeMonth}
          title={t.hours.showWholeMonth}
          onClick={() => onDayChange?.(null)}
        >
          <X className="size-4" strokeWidth={1.9} aria-hidden />
        </Button>
      )}

      <Stepper
        direction="later"
        label={t.hours.nextPeriod}
        onClick={() => step(1)}
      />
    </div>
  );
}
