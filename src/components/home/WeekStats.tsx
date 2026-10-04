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
}

/** Мини-талоны дней недели: день, число, часы, штамп звіта. */
export function WeekStats({ days, className }: { days: readonly WeekDay[]; className?: string }) {
  return (
    <Ticket variant="sections" className={className}>
      <div className="flex">
        {days.map((day) => (
          <WeekMiniTicket
            key={day.key}
            weekday={day.weekday}
            day={day.day}
            hours={day.hours}
            report={day.report}
          />
        ))}
      </div>
    </Ticket>
  );
}
