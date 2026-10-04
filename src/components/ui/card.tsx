import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const cardVariants = cva("rounded-card border border-border text-text", {
  variants: {
    tone: {
      surface: "bg-surface",
      muted: "bg-surface-2",
      primary: "border-primary bg-primary text-on-primary",
    },
    padding: {
      none: "",
      sm: "p-3",
      md: "p-4",
      lg: "p-5",
    },
    selected: {
      true: "border-primary bg-primary-tint",
    },
    interactive: {
      true: "cursor-pointer text-left transition-colors duration-150 outline-none hover:bg-primary-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    },
  },
  defaultVariants: { tone: "surface", padding: "md" },
})

function Card({
  className,
  tone,
  padding,
  interactive,
  selected,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof cardVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "div"

  return (
    <Comp
      data-slot="card"
      className={cn(cardVariants({ tone, padding, interactive, selected }), className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn("text-[15px] leading-snug font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-[13px] text-text-muted", className)}
      {...props}
    />
  )
}

export { Card, CardTitle, CardDescription, cardVariants }
