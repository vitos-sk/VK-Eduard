import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

type StepperProps = Omit<React.ComponentProps<"button">, "children"> & {
  /** `earlier` — шеврон влево («Раніше»), `later` — вправо («Пізніше»). */
  direction: "earlier" | "later"
  /** Видимого текста нет: название идёт в `aria-label` и тултип. */
  label: string
}

/** Кнопка-стрелка 30 px: сдвиг времени раньше/позже. Зона нажатия 44 px через `before`. */
function Stepper({ direction, label, className, type, ...props }: StepperProps) {
  const Icon = direction === "earlier" ? ChevronLeft : ChevronRight

  return (
    <button
      type={type ?? "button"}
      data-slot="stepper"
      aria-label={label}
      title={label}
      className={cn(
        "relative inline-flex h-[30px] w-8 shrink-0 items-center justify-center rounded-md border border-edge bg-ticket text-text transition-colors outline-none before:absolute before:top-1/2 before:left-1/2 before:size-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] hover:bg-primary-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:text-ink-3",
        className
      )}
      {...props}
    >
      <Icon className="size-4" strokeWidth={1.9} aria-hidden />
    </button>
  )
}

export { Stepper }
