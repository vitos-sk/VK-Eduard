import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/** Прямоугольный бейдж: рамка 1 px, радиус 4. Для состояний отчёта см. `StampTag`. */
const badgeVariants = cva(
  "inline-flex h-5 w-fit shrink-0 items-center gap-1.5 rounded-sm border px-1.5 text-[12px] font-semibold whitespace-nowrap [&_svg]:size-3.5",
  {
    variants: {
      variant: {
        neutral: "border-ink-3 text-ink-2",
        success: "border-primary text-primary",
        warning: "border-warn text-warn",
        danger: "border-err text-err",
        accent: "border-yellow bg-yellow text-ink",
        primary: "border-primary bg-primary text-on-primary",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
)

function Badge({
  className,
  variant,
  dot = false,
  children,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { dot?: boolean }) {
  return (
    <span
      data-slot="badge"
      data-variant={variant ?? "neutral"}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {dot && <i aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

export { Badge, badgeVariants }
