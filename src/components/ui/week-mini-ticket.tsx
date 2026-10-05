"use client";

import { Check } from "lucide-react";

import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils"

interface WeekMiniTicketProps {
  weekday: string
  day: number
  /** Часы дня, строкой `ч:мм`; `null` — записей нет. */
  hours: string | null
  /** `null` — отметку не показываем (нет реального состояния). */
  report: "submitted" | "notSubmitted" | null
  /** Сегодня — подсвечен, будущий день — приглушён. */
  when?: "past" | "today" | "future"
  className?: string
}

/**
 * Клетка дня недели: день недели, число, часы, отметка звіта. Лежит рядом с шестью такими же
 * в `Ticket variant="sections"`, клетки разделены пунктиром. Отметка — иконка, а не слово «Подано»:
 * в семь колонок слово не помещается, а смысл подсказан под рядом.
 */
function WeekMiniTicket({ weekday, day, hours, report, when = "past", className }: WeekMiniTicketProps) {
  const t = useT();
  const isToday = when === "today";

  return (
    <div
      data-slot="week-mini-ticket"
      aria-current={isToday ? "date" : undefined}
      className={cn(
        "flex min-w-0 flex-col items-center gap-1 px-0.5 py-2.5 text-center not-first:border-l not-first:border-dashed not-first:border-perf",
        isToday && "bg-primary-tint",
        when === "future" && "opacity-45",
        className
      )}
    >
      <span className={cn("text-[11px] font-medium uppercase lg:text-[12px]", isToday ? "text-primary" : "text-ink-2")}>
        {weekday}
      </span>
      <span
        className={cn(
          "tabular grid size-8 place-items-center rounded-full text-[16px] leading-none font-semibold",
          isToday && "bg-primary text-on-primary"
        )}
      >
        {day}
      </span>
      <span className={cn("tabular text-[12px] lg:text-[14px]", hours ? "font-medium text-text" : "text-ink-3")}>
        {hours ?? t.common.dash}
      </span>
      <span className="flex h-4 items-center">
        {report === "submitted" && (
          <Check
            className="size-4 text-primary"
            strokeWidth={2.4}
            aria-label={t.home.dayReport.submitted}
          />
        )}
        {report === "notSubmitted" && (
          <span
            role="img"
            aria-label={t.home.dayReport.notSubmitted}
            className="size-2 rounded-full bg-warn"
          />
        )}
      </span>
    </div>
  )
}

export { WeekMiniTicket }
