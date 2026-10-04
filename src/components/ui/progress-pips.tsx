import { cn } from "@/lib/utils"

type PipState = "done" | "current" | "next"

interface ProgressPipsProps {
  /** Подписи шагов, например «Години», «Звіт», «Фото». */
  steps: readonly string[]
  /** Индекс текущего шага; равный длине списка — всё выполнено. */
  current: number
  className?: string
}

/**
 * Указатель из трёх шагов. Выполненный — зелёный с белым текстом;
 * текущий — рамка 1 px и жёлтый треугольник сверху; следующие — пунктир.
 */
export function ProgressPips({ steps, current, className }: ProgressPipsProps) {
  return (
    <ol
      data-slot="progress-pips"
      className={cn("grid gap-1 pt-1.5", className)}
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
    >
      {steps.map((label, index) => {
        const state: PipState = index < current ? "done" : index === current ? "current" : "next"

        return (
          <li
            key={label}
            aria-current={state === "current" ? "step" : undefined}
            data-state={state}
            className={cn(
              "relative flex h-6 items-center justify-center rounded-sm text-[12px] font-semibold",
              state === "done" && "bg-primary text-on-primary",
              state === "current" && "border border-primary text-primary",
              state === "next" && "border border-dashed border-perf text-ink-2"
            )}
          >
            {state === "current" && (
              <i
                aria-hidden
                className="absolute -top-2 left-1/2 -translate-x-1/2 border-x-4 border-t-[5px] border-x-transparent border-t-yellow"
              />
            )}
            {label}
          </li>
        )
      })}
    </ol>
  )
}
