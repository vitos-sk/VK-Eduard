import { StampTag } from "@/components/ui/stamp-tag"
import { t } from "@/lib/i18n"
import { cn } from "@/lib/utils"

interface WeekMiniTicketProps {
  weekday: string
  day: number
  /** Часы дня, строкой `ч:мм`; `null` — записей нет. */
  hours: string | null
  /** `null` — стамп не показываем (нет реального состояния). */
  report: "submitted" | "notSubmitted" | null
  className?: string
}

/** Мини-талон дня недели. Лежит рядами в `Ticket variant="sections"`, разделён пунктиром. */
function WeekMiniTicket({ weekday, day, hours, report, className }: WeekMiniTicketProps) {
  return (
    <div
      data-slot="week-mini-ticket"
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1.5 py-2 text-center not-first:border-l not-first:border-dashed not-first:border-perf",
        className
      )}
    >
      <span className="text-[12px] font-medium text-ink-2">{weekday}</span>
      <span className="tabular text-[18px] leading-tight font-semibold">{day}</span>
      <span className="tabular text-[14px] text-ink-2">{hours ?? t.common.dash}</span>
      <span className="mt-0.5 flex h-5 items-center">
        {report && (
          <StampTag className="px-1 tracking-[0.02em]" variant={report === "submitted" ? "submitted" : "notSubmitted"}>
            {report === "submitted" ? t.home.dayReport.submitted : t.home.dayReport.notSubmitted}
          </StampTag>
        )}
      </span>
    </div>
  )
}

export { WeekMiniTicket }
