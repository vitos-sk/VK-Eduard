import { fmt, minutesToTime, timeToMinutes } from "@/lib/format";
import { t } from "@/lib/i18n";
import { dayChartTicks, daySheet } from "@/lib/mock/timesheet";
import { cn } from "@/lib/utils";

/** Границы шкалы: 06:00 — 18:00. */
const RANGE_START = timeToMinutes(dayChartTicks[0]);
const RANGE_END = timeToMinutes(dayChartTicks[dayChartTicks.length - 1]);
const RANGE_SPAN = RANGE_END - RANGE_START;

/** Минуты от полуночи → позиция на полосе, в процентах. */
function toPercent(minutes: number): number {
  const clamped = Math.min(Math.max(minutes, RANGE_START), RANGE_END);

  return ((clamped - RANGE_START) / RANGE_SPAN) * 100;
}

const startMin = timeToMinutes(daySheet.startAt);
const breakStartMin = timeToMinutes(
  daySheet.timeline.find((point) => point.kind === "break")?.time ?? "12:30",
);
const breakEndMin = breakStartMin + Math.floor(daySheet.breakSec / 60);
const nowMin = timeToMinutes(
  daySheet.timeline.find((point) => point.kind === "now")?.time ?? "14:00",
);

/**
 * «Графік робочого дня»: полоса отработанного времени с перерывом,
 * маркеры границ, подписи под ними и шкала 06:00 — 18:00.
 * Всё на div'ах — внешние чарт-библиотеки в этой фазе не подключаем.
 */
export function DayTimelineCard({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "rounded-[16px] border border-border bg-surface p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-bold">{t.hours.dayChart}</h2>
        <p className="text-[13px] font-medium text-text-muted">
          {fmt(t.hours.updatedAt, { time: daySheet.updatedAt })}
        </p>
      </div>

      <div className="relative mt-6 h-3 rounded-full bg-surface-2">
        <Segment from={startMin} to={breakStartMin} className="bg-brand" />
        <Segment
          from={breakStartMin}
          to={breakEndMin}
          className="bg-warning/40"
        />
        <Segment from={breakEndMin} to={nowMin} className="bg-brand" />

        <Marker at={startMin} className="bg-brand" />
        <Marker at={breakStartMin} className="bg-warning" />
        <Marker at={nowMin} className="bg-text" />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <TimelineLabel
          value={daySheet.startAt}
          label={t.hours.start}
          align="left"
        />
        <TimelineLabel
          value={minutesToTime(breakStartMin)}
          label={`${t.hours.break} ${minutesToTime(
            Math.floor(daySheet.breakSec / 60),
          )}`}
          align="center"
        />
        <TimelineLabel
          value={minutesToTime(nowMin)}
          label={t.hours.now}
          align="right"
        />
      </div>

      <div className="tabular mt-4 flex justify-between border-t border-border pt-3 text-[11px] font-semibold text-text-dim">
        {dayChartTicks.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>
    </section>
  );
}

function Segment({
  from,
  to,
  className,
}: {
  from: number;
  to: number;
  className: string;
}) {
  const left = toPercent(from);
  const width = Math.max(0, toPercent(to) - left);

  if (width === 0) {
    return null;
  }

  return (
    <span
      aria-hidden
      style={{ left: `${left}%`, width: `${width}%` }}
      className={cn("absolute inset-y-0 rounded-full", className)}
    />
  );
}

function Marker({ at, className }: { at: number; className: string }) {
  return (
    <span
      aria-hidden
      style={{ left: `${toPercent(at)}%` }}
      className={cn(
        "absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface",
        className,
      )}
    />
  );
}

function TimelineLabel({
  value,
  label,
  align,
}: {
  value: string;
  label: string;
  align: "left" | "center" | "right";
}) {
  return (
    <div
      className={cn(
        align === "left" && "text-left",
        align === "center" && "text-center",
        align === "right" && "text-right",
      )}
    >
      <p className="tabular text-[15px] font-bold">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium text-text-muted">{label}</p>
    </div>
  );
}
