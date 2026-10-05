"use client";

import { useEffect, useState } from "react";
import { addMonths } from "date-fns";
import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LazyCalendar as Calendar, preloadCalendar } from "@/components/ui/lazy-calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Stepper } from "@/components/ui/stepper";
import type { Dict } from "@/lib/i18n";
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
  className?: string;
}

/**
 * Навигатор месяца: стрелка назад, кнопка с названием месяца (открывает календарь),
 * стрелка вперёд. Один и тот же вид на экранах «Години» и «Звіти».
 */
export function MonthNavigator({ date, onChange, className }: MonthNavigatorProps) {
  const t = useT();
  const locale = useLocale();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(preloadCalendar, 1500);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Stepper
        direction="earlier"
        label={t.hours.prevPeriod}
        onClick={() => onChange(addMonths(date, -1))}
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
            <span className="whitespace-nowrap">{monthTitle(date, t)}</span>
          </Button>
        </PopoverTrigger>

        <PopoverContent align="center" className="w-auto border border-edge bg-ticket p-2">
          <Calendar
            mode="single"
            selected={date}
            defaultMonth={date}
            onSelect={(next) => {
              if (next) {
                onChange(next);
                setIsCalendarOpen(false);
              }
            }}
            locale={DATE_FNS_LOCALES[locale]}
          />
        </PopoverContent>
      </Popover>

      <Stepper
        direction="later"
        label={t.hours.nextPeriod}
        onClick={() => onChange(addMonths(date, 1))}
      />
    </div>
  );
}
