import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex h-[26px] w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-bold whitespace-nowrap [&_svg]:size-3.5",
  {
    variants: {
      variant: {
        neutral: "bg-surface-2 text-text-muted",
        success: "bg-success/15 text-success-fg",
        warning: "bg-warning/20 text-warning-fg",
        danger: "bg-danger/15 text-danger-fg",
        accent: "bg-accent text-on-accent",
        primary: "bg-primary text-on-primary",
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
