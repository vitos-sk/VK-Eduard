"use client"

import { useT } from "@/lib/i18n/client"
import { cn } from "@/lib/utils"

function Spinner({ className, ...props }: React.ComponentProps<"span">) {
  const t = useT()

  return (
    <span
      role="status"
      aria-label={t.common.loading}
      data-slot="spinner"
      className={cn(
        "inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  )
}

export { Spinner }
