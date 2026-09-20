import * as React from "react"

import { cn } from "@/lib/utils"

/** Выбираемая «таблетка»: категория работ, фильтр, вариант выбора. Состояние — `selected`. */
function Chip({
  className,
  selected = false,
  type,
  ...props
}: React.ComponentProps<"button"> & { selected?: boolean }) {
  return (
    <button
      type={type ?? "button"}
      data-slot="chip"
      aria-pressed={selected}
      className={cn(
        "inline-flex h-ctl-sm shrink-0 items-center justify-center gap-1.5 rounded-full border px-3.5 text-[13px] font-bold whitespace-nowrap transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-45",
        selected
          ? "border-primary bg-primary text-on-primary"
          : "border-border bg-surface text-text-muted hover:bg-surface-2",
        className
      )}
      {...props}
    />
  )
}

export { Chip }
