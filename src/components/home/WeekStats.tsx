import { Check } from "lucide-react";

import { Ticket } from "@/components/ui/ticket";
import { WeekMiniTicket } from "@/components/ui/week-mini-ticket";

export interface WeekDay {
  /** `YYYY-MM-DD`. */
  key: string;
  weekday: string;
  day: number;
  /** Часы дня `ч:мм`; `null` — записей нет. */
  hours: string | null;
  report: "submitted" | "notSubmitted" | null;
  /** Сегодня — подсвечен, будущие дни приглушены. */
  when: "past" | "today" | "future";
}

/**
 * Неделя целиком (пн–вс), семь равных клеток: день недели, число, часы и отметка звіта
 * (галочка — подан, точка — часы есть, а звіта нет). Под рядом — короткая подсказка к отметкам.
 */
export function WeekStats({
  days,
  legend,
  className,
}: {
  days: readonly WeekDay[];
  /** Подписи к отметкам: [подан, не подан]. */
  legend: readonly [string, string];
  className?: string;
}) {
  return (
    <div className={className}>
      <Ticket variant="sections">
        <div className="grid grid-cols-7">
          {days.map((day) => (
            <WeekMiniTicket
              key={day.key}
              weekday={day.weekday}
              day={day.day}
              hours={day.hours}
              report={day.report}
              when={day.when}
            />
          ))}
        </div>
      </Ticket>

      <p className="mt-2 flex items-center gap-4 text-[12px] text-ink-2">
        <span className="flex items-center gap-1.5">
          <Check className="size-3.5 text-primary" strokeWidth={2.4} aria-hidden />
          {legend[0]}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full bg-warn" />
          {legend[1]}
        </span>
      </p>
    </div>
  );
}
