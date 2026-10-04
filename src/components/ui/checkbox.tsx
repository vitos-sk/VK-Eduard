"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/** Квадрат 18 px, радиус 4, рамка 1.5 px. Выбран — зелёная заливка с белой галочкой. */
function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "relative flex size-[18px] shrink-0 items-center justify-center rounded-sm border-[1.5px] border-ink-2 bg-ticket text-on-primary transition-colors outline-none before:absolute before:top-1/2 before:left-1/2 before:size-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 data-checked:border-primary data-checked:bg-primary aria-invalid:border-danger-fg",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator">
        <CheckIcon className="size-3.5" strokeWidth={3} aria-hidden />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

/** Чисто визуальная отметка для строк, которые сами являются кнопкой (без вложенного button). */
function CheckMark({ checked, className }: { checked: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      data-slot="check-mark"
      className={cn(
        "flex size-[18px] shrink-0 items-center justify-center rounded-sm border-[1.5px] text-on-primary",
        checked ? "border-primary bg-primary" : "border-ink-2 bg-ticket",
        className
      )}
    >
      {checked && <CheckIcon className="size-3.5" strokeWidth={3} />}
    </span>
  )
}

export { Checkbox, CheckMark }
