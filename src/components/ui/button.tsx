import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-ctl border border-transparent font-bold whitespace-nowrap transition-[background-color,border-color,transform] duration-150 outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 aria-busy:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        primary: "bg-primary text-on-primary hover:bg-primary-hover",
        secondary: "bg-secondary text-on-secondary hover:bg-secondary-hover",
        accent: "bg-accent text-on-accent shadow-accent hover:bg-accent-hover",
        outline:
          "border-border-strong bg-transparent text-text hover:bg-surface-2",
        ghost: "bg-transparent text-text hover:bg-surface-2",
        danger: "bg-danger text-on-danger hover:bg-danger-hover",
        "danger-outline":
          "border-danger/40 bg-transparent text-danger-fg hover:bg-danger/10",
        scrim: "bg-scrim text-on-scrim hover:bg-scrim-strong",
        field:
          "border-border-strong bg-field font-semibold text-text hover:border-text-dim",
        bare: "bg-transparent font-normal text-inherit active:scale-100",
      },
      size: {
        sm: "h-ctl-sm rounded-sm px-3 text-[13px]",
        md: "h-ctl-md px-4 text-[14px]",
        lg: "h-ctl-lg px-5 text-[15px]",
        xl: "h-ctl-xl px-6 text-[17px]",
        "icon-sm": "size-ctl-sm rounded-full p-0",
        icon: "size-ctl-md rounded-full p-0",
        "icon-xs": "size-6 rounded-full p-0 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-15 rounded-full p-0",
        field: "h-field w-full justify-start px-4 text-[16px]",
        bare: "h-auto justify-start gap-0 rounded-none p-0 text-left",
      },
      block: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "lg",
    },
  }
)

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    loading?: boolean
  }

function Button({
  className,
  variant,
  size,
  block,
  asChild = false,
  loading = false,
  disabled,
  children,
  type,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size, block }), className)

  if (asChild) {
    return (
      <Slot.Root data-slot="button" className={classes} {...props}>
        {children}
      </Slot.Root>
    )
  }

  return (
    <button
      type={type ?? "button"}
      data-slot="button"
      data-variant={variant ?? "primary"}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner aria-hidden />}
      {children}
    </button>
  )
}

export { Button, buttonVariants }
