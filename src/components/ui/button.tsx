import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"

const buttonVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center gap-2 rounded-ctl border border-transparent font-semibold whitespace-nowrap transition-colors duration-150 outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:cursor-not-allowed aria-busy:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active aria-busy:bg-primary-hover disabled:bg-disabled disabled:text-text-dim",
        outline:
          "border-primary bg-surface text-primary hover:bg-primary-tint active:bg-primary-tint disabled:border-edge disabled:bg-disabled disabled:text-text-dim",
        ghost:
          "bg-transparent text-primary hover:bg-primary-tint active:bg-primary-tint disabled:text-text-dim",
        danger:
          "border-danger-edge bg-surface text-danger-fg hover:bg-surface-2 active:bg-surface-2 disabled:border-edge disabled:bg-disabled disabled:text-text-dim",
        secondary:
          "bg-secondary text-on-secondary hover:bg-secondary-hover active:bg-secondary-hover disabled:text-text-dim",
        scrim: "bg-scrim text-on-scrim hover:bg-scrim-strong",
        field:
          "border-border-strong bg-field text-text hover:border-text-dim disabled:text-text-dim",
        bare: "bg-transparent font-normal text-inherit",
      },
      size: {
        sm: "h-8 rounded-ctl px-3 text-[13px] before:absolute before:inset-x-0 before:top-1/2 before:h-11 before:-translate-y-1/2 before:content-['']",
        md: "h-ctl-md px-4 text-[15px]",
        lg: "h-ctl-lg px-5 text-[15px]",
        xl: "h-ctl-md px-6 text-[15px]",
        "icon-sm":
          "size-8 p-0 before:absolute before:top-1/2 before:left-1/2 before:size-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']",
        icon: "size-ctl-md p-0",
        "icon-xs":
          "size-6 p-0 before:absolute before:top-1/2 before:left-1/2 before:size-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-ctl-md p-0",
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
  onClick,
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
      disabled={disabled}
      aria-busy={loading || undefined}
      // loading не ставит `disabled`: иначе кнопка серела бы вместо «зелёная + спиннер».
      // Повторное нажатие блокируем здесь (мышь и клавиатура).
      onClick={(event) => {
        if (loading) {
          event.preventDefault()
          return
        }
        onClick?.(event)
      }}
      {...props}
    >
      {loading && <Spinner aria-hidden />}
      {children}
    </button>
  )
}

export { Button, buttonVariants }
