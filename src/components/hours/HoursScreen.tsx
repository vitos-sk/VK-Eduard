"use client";

import { useState } from "react";
import { addDays, addMonths, addWeeks, endOfWeek, startOfWeek } from "date-fns";
import { uk as ukLocale } from "date-fns/locale";
import { CalendarDays } from "lucide-react";

import { DayActions } from "@/components/hours/DayActions";
import { DayDetailsCard } from "@/components/hours/DayDetailsCard";
import { DaySummaryCard } from "@/components/hours/DaySummaryCard";
import { DayTimelineCard } from "@/components/hours/DayTimelineCard";
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
import {
  daySheet,
  monthSummary,
  weekSummary,
} from "@/lib/mock/timesheet";
import { TODAY } from "@/lib/mock/user";
import type { WorkStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type Period = "day" | "week" | "month";

const PERIOD_OPTIONS: readonly SegmentedOption<Period>[] = [
  { value: "day", label: t.hours.tabs.day },
  { value: "week", label: t.hours.tabs.week },
  { value: "month", label: t.hours.tabs.month },
];

/** Время последней отметки на таймлайне — им закрывается день. */
const NOW_TIME =
  daySheet.timeline.find((point) => point.kind === "now")?.time ?? "14:00";

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

/**
 * Экран «Години». Стрелки навигатора и календарь листают период визуально —
 * данные остаются моковыми, это допущение UI-фазы.
 */
export function HoursScreen() {
  const [period, setPeriod] = useState<Period>("day");
  const [date, setDate] = useState<Date>(TODAY);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [status, setStatus] = useState<WorkStatus>(daySheet.status);
  const [endAt, setEndAt] = useState<string | null>(daySheet.endAt);

  const shiftPeriod = (direction: 1 | -1) => {
    setDate((current) => {
      if (period === "day") {
        return addDays(current, direction);
      }

      return period === "week"
        ? addWeeks(current, direction)
        : addMonths(current, direction);
    });
  };

  const toggleWork = () => {
    if (status === "completed") {
      setStatus("in_progress");
      setEndAt(null);

      return;
    }

    setStatus("completed");
    setEndAt(NOW_TIME);
  };

  const togglePause = () => {
    setStatus((current) => (current === "paused" ? "in_progress" : "paused"));
  };

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

        <PeriodNavigator
          className="mt-3"
          title={getPeriodTitle(period, date)}
          onPrev={() => shiftPeriod(-1)}
          onNext={() => shiftPeriod(1)}
        />

        {period === "day" && (
          <div className="mt-3 space-y-3">
            <DaySummaryCard status={status} endAt={endAt} />
            <DayTimelineCard />
            <DayDetailsCard />
            <DayActions
              className="pt-1"
              status={status}
              onToggleWork={toggleWork}
              onTogglePause={togglePause}
            />
          </div>
        )}

        {period === "week" && <PeriodView className="mt-3" summary={weekSummary} />}

        {period === "month" && (
          <PeriodView className="mt-3" summary={monthSummary} labelEvery={5} />
        )}
      </div>
    </div>
  );
}
