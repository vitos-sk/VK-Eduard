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
    elevated: {
      true: "shadow-sm",
    },
    selected: {
      true: "border-primary bg-primary/10",
    },
    interactive: {
      true: "cursor-pointer text-left transition-[background-color,border-color,transform] duration-150 outline-none hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.99]",
    },
  },
  defaultVariants: { tone: "surface", padding: "md" },
})

function Card({
  className,
  tone,
  padding,
  elevated,
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
      className={cn(cardVariants({ tone, padding, elevated, interactive, selected }), className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn("text-[17px] leading-snug font-bold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-[13.5px] font-medium text-text-muted", className)}
      {...props}
    />
  )
}

export { Card, CardTitle, CardDescription, cardVariants }
