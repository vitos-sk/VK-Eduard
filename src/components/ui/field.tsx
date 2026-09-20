import * as React from "react"

import { cn } from "@/lib/utils"

/** Подпись + контрол + подсказка/ошибка. Ошибка озвучивается скринридером. */
function Field({
  label,
  hint,
  error,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"label">, "children"> & {
  label?: React.ReactNode
  hint?: React.ReactNode
  error?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <label
      data-slot="field"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    >
      {label && (
        <span className="text-[13px] font-bold text-text-muted">{label}</span>
      )}
      {children}
      {error ? (
        <span aria-live="polite" className="text-[13px] font-semibold text-danger-fg">
          {error}
        </span>
      ) : (
        hint && (
          <span className="text-[13px] font-medium text-text-muted">{hint}</span>
        )
      )}
    </label>
  )
}

export { Field }
