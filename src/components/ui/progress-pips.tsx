import { cn } from "@/lib/utils"

/** Дальше этого числа сегменты становятся слишком мелкими — рисуем сплошную линейку. */
const MAX_SEGMENTS = 24

/**
 * Прогресс чеклиста: по сегменту на пункт, выполненные — зелёные, остальные — цвета трека линейки.
 * Радиус сегмента 4 px (как у чекбокса). `size="md"` — крупная полоса на экране чеклиста, `sm` — в строках списков.
 */
function ProgressPips({
  done,
  total,
  size = "sm",
  label,
  className,
}: {
  done: number
  total: number
  size?: "sm" | "md"
  /** Подпись для скринридера, например «3 з 7». */
  label?: string
  className?: string
}) {
  const height = size === "md" ? "h-2.5" : "h-1.5"
  const value = Math.min(Math.max(done, 0), Math.max(total, 0))

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={value}
      data-slot="progress-pips"
      className={cn("flex gap-0.5", className)}
    >
      {total === 0 || total > MAX_SEGMENTS ? (
        <span className={cn("block w-full overflow-hidden rounded-sm bg-scale", height)}>
          <span
            className="block h-full bg-primary"
            style={{ width: total === 0 ? 0 : `${(value / total) * 100}%` }}
          />
        </span>
      ) : (
        Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={cn("block flex-1 rounded-sm", height, index < value ? "bg-primary" : "bg-scale")}
          />
        ))
      )}
    </div>
  )
}

export { ProgressPips }
