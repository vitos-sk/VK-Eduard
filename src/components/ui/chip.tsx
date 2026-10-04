import * as React from "react"

import { cn } from "@/lib/utils"

/** Выбираемый чип: категория работ, фильтр, вариант выбора. Состояние — `selected`. Не пилюля: радиус 6. */
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
        // `before` расширяет зону нажатия до 44 px, не меняя размер чипа
        "relative inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-md border px-2.5 text-[13px] font-medium whitespace-nowrap transition-colors outline-none before:absolute before:-inset-y-2 before:inset-x-0 before:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:text-text-dim",
        selected
          ? "border-primary bg-primary text-on-primary"
          : "border-edge bg-ticket text-text hover:bg-primary-tint",
        className
      )}
      {...props}
    />
  )
}

export { Chip }
