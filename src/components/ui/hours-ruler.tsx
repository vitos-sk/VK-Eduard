import { formatHoursShort } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Шкала дня 0–10 ч для сумм до 9:30; для больших сумм расширяется. */
const SCALES = [10, 12, 14, 16, 18] as const

/** Подбирает шкалу в часах под сумму в минутах. */
export function pickRulerScale(minutes: number): number {
  const hours = minutes / 60

  return SCALES.find((max) => hours <= max - 0.5) ?? SCALES[SCALES.length - 1]
}

/** Деления: каждые 0.5 ч, подписи — чётные часы. */
function Ticks({ halves }: { halves: number }) {
  return (
    <svg
      aria-hidden
      className="absolute inset-0 size-full text-ink-2"
      preserveAspectRatio="none"
      viewBox={`0 0 ${halves} 8`}
    >
      <line x1="0" x2={halves} y1="7.5" y2="7.5" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      {Array.from({ length: halves + 1 }, (_, index) => (
        <line
          key={index}
          x1={index}
          x2={index}
          y1="3"
          y2="8"
          stroke="currentColor"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  )
}

interface TotalProps {
  /** Отработано, минуты. */
  minutes: number
  /** Норма, минуты: жёлтая отметка. Берётся из `profile.norm`. */
  normMinutes?: number
  className?: string
}

/**
 * Линейка часов — сигнатура дизайна: трек 8 px с делениями каждые 0.5 ч,
 * зелёная заливка «отработано», жёлтая отметка нормы, подписи mono 12 px.
 */
export function HoursRuler({ minutes, normMinutes, className }: TotalProps) {
  const scale = pickRulerScale(minutes)
  const total = scale * 60
  const percent = (value: number) => `${Math.min(100, Math.max(0, (value / total) * 100))}%`
  const labels = Array.from({ length: scale / 2 + 1 }, (_, index) => index * 2)

  return (
    <div
      role="img"
      aria-label={
        normMinutes
          ? `${formatHoursShort(minutes)} / ${formatHoursShort(normMinutes)}`
          : formatHoursShort(minutes)
      }
      className={cn("relative mt-3 h-[34px]", className)}
    >
      <div className="absolute inset-x-0 top-0 h-2">
        <Ticks halves={scale * 2} />
        <div
          className="absolute top-0 left-0 h-2 rounded-xs bg-primary"
          style={{ width: percent(minutes) }}
        />
      </div>
      {normMinutes ? (
        <div
          className="absolute -top-[5px] h-[18px] w-0.5 rounded-[1px] bg-yellow"
          style={{ left: percent(normMinutes) }}
        />
      ) : null}
      {labels.map((hour, index) => (
        <span
          key={hour}
          className={cn(
            "tabular absolute top-3.5 text-[12px] whitespace-nowrap text-ink-2",
            index === 0 ? "" : index === labels.length - 1 ? "-translate-x-full" : "-translate-x-1/2"
          )}
          style={{ left: percent(hour * 60) }}
        >
          {hour}
        </span>
      ))}
    </div>
  )
}

interface RangeProps {
  /** Начало и завершение, минуты от полуночи. */
  startMinutes: number
  endMinutes: number
  className?: string
}

const RANGE_FROM = 6 * 60
const RANGE_TO = 18 * 60
const RANGE_LABELS = [6, 8, 12, 16, 18]

/** Линейка начала–завершения: шкала 06–18, зелёные отметки на границах. */
export function TimeRangeRuler({ startMinutes, endMinutes, className }: RangeProps) {
  const percent = (value: number) =>
    `${Math.min(100, Math.max(0, ((value - RANGE_FROM) / (RANGE_TO - RANGE_FROM)) * 100))}%`
  const start = Math.min(startMinutes, endMinutes)
  const end = Math.max(startMinutes, endMinutes)
  const fillLeft = Math.min(100, Math.max(0, ((start - RANGE_FROM) / (RANGE_TO - RANGE_FROM)) * 100))
  const fillRight = Math.min(100, Math.max(0, ((end - RANGE_FROM) / (RANGE_TO - RANGE_FROM)) * 100))

  return (
    <div role="img" className={cn("relative mt-1.5 h-10", className)}>
      <div className="absolute inset-x-0 top-0 h-2">
        <Ticks halves={(RANGE_TO - RANGE_FROM) / 30} />
        <div
          className="absolute top-0 h-2 rounded-xs bg-primary"
          style={{ left: `${fillLeft}%`, width: `${Math.max(0, fillRight - fillLeft)}%` }}
        />
      </div>
      <div className="absolute -top-[5px] h-[18px] w-0.5 rounded-[1px] bg-primary" style={{ left: percent(start) }} />
      <div className="absolute -top-[5px] h-[18px] w-0.5 rounded-[1px] bg-primary" style={{ left: percent(end) }} />
      {RANGE_LABELS.map((hour, index) => (
        <span
          key={hour}
          className={cn(
            "tabular absolute top-3.5 text-[12px] whitespace-nowrap text-ink-2",
            index === 0 ? "" : index === RANGE_LABELS.length - 1 ? "-translate-x-full" : "-translate-x-1/2"
          )}
          style={{ left: percent(hour * 60) }}
        >
          {hour}
        </span>
      ))}
    </div>
  )
}
