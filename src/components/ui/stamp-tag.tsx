import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const stampTagVariants = cva(
  "inline-flex h-5 w-fit shrink-0 items-center rounded-sm border px-1.5 text-[12px] leading-none font-semibold tracking-[0.04em] whitespace-nowrap uppercase",
  {
    variants: {
      variant: {
        /** Звіт подано — рамка і текст зелені. */
        submitted: "border-primary text-primary",
        /** Звіт не подано — попередження. */
        notSubmitted: "border-warn text-warn",
        /** «вручну», «триває». */
        neutral: "border-ink-3 text-ink-2",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
)

/**
 * Штамп стану запису. Показуємо тільки реальні стани:
 * «Подано» з'являється тільки для поданого звіту.
 */
function StampTag({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof stampTagVariants>) {
  return (
    <span
      data-slot="stamp-tag"
      data-variant={variant ?? "neutral"}
      className={cn(stampTagVariants({ variant }), className)}
      {...props}
    />
  )
}

export { StampTag, stampTagVariants }
