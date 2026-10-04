import { formatHoursShort } from "@/lib/format"
import { cn } from "@/lib/utils"

export interface ChartBar {
  key: string
  /** Подпись под столбцом: «5 пн». */
  label: string
  /** Минуты. */
  value: number
  /** Текущий день — единственный жёлтый столбец. */
  current?: boolean
}

interface ChartBarsProps {
  bars: readonly ChartBar[]
  /** Подпись для скринридера. */
  ariaLabel: string
  className?: string
}

/** Подписи значений нужны, пока столбцы не слипаются. */
const MAX_LABELLED = 10

/**
 * Столбчатый график часов: зелёные столбцы, текущий день жёлтый, значения mono 12 px
 * над столбцами, подписи дней 12 px, сетка 1 px цвета `scale`. Без теней и градиентов.
 */
export function ChartBars({ bars, ariaLabel, className }: ChartBarsProps) {
  const max = Math.max(1, ...bars.map((bar) => bar.value))
  // Верх шкалы — ближайший час вверх, чтобы столбец не упирался в край
  const top = Math.ceil(max / 60) * 60
  const maxValue = bars.reduce((best, bar) => (bar.value > best ? bar.value : best), 0)
  const dense = bars.length > MAX_LABELLED

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={cn("relative h-full min-h-[170px] w-full", className)}
    >
      <div className="absolute inset-x-0 top-5 bottom-[22px]">
        {[0, 25, 50, 75].map((offset) => (
          <div
            key={offset}
            aria-hidden
            className="absolute inset-x-0 h-px bg-scale"
            style={{ top: `${offset}%` }}
          />
        ))}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-ink-2" />
        <div className="absolute inset-0 flex items-end gap-1">
          {bars.map((bar) => {
            const showValue = !dense || bar.current || (bar.value > 0 && bar.value === maxValue)

            return (
              <div key={bar.key} className="relative flex h-full min-w-0 flex-1 items-end justify-center">
                <div
                  className={cn(
                    "relative w-full max-w-[34px] rounded-t-[3px]",
                    bar.current ? "bg-yellow" : "bg-primary"
                  )}
                  style={{ height: `${(bar.value / top) * 100}%` }}
                >
                  {showValue && bar.value > 0 && (
                    <span className="tabular absolute -top-[18px] left-1/2 -translate-x-1/2 text-[12px] whitespace-nowrap text-ink">
                      {formatHoursShort(bar.value)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex gap-1">
        {bars.map((bar) => (
          <span
            key={bar.key}
            className="min-w-0 flex-1 truncate text-center text-[12px] text-ink-2"
          >
            {dense ? bar.label.split(" ")[0] : bar.label}
          </span>
        ))}
      </div>
    </div>
  )
}
