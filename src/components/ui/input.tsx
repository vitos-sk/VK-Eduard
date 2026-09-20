import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/** 16px и больше — иначе iOS зумит страницу при фокусе в поле. */
const fieldVariants = cva(
  "w-full min-w-0 rounded-ctl border border-border-strong bg-field text-[16px] font-semibold text-text transition-[border-color,box-shadow] outline-none placeholder:font-medium placeholder:text-text-dim hover:border-text-dim focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-55 aria-invalid:border-danger-fg aria-invalid:ring-3 aria-invalid:ring-danger/20",
  {
    variants: {
      size: {
        sm: "h-ctl-md px-3",
        md: "h-field px-4",
        lg: "h-ctl-xl px-4",
      },
    },
    defaultVariants: { size: "md" },
  }
)

type InputProps = Omit<React.ComponentProps<"input">, "size"> &
  VariantProps<typeof fieldVariants>

function Input({ className, size, type, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(fieldVariants({ size }), className)}
      {...props}
    />
  )
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        fieldVariants({ size: null }),
        "min-h-24 resize-y px-4 py-3 leading-[1.45]",
        className
      )}
      {...props}
    />
  )
}

export { Input, Textarea, fieldVariants }
