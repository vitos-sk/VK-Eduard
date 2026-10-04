import * as React from "react"

import { cn } from "@/lib/utils"

/** Баннер без связи: фон `notice`, текст цвета предупреждения, одна строка. */
function OfflineBanner({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="status"
      data-slot="offline-banner"
      className={cn(
        "truncate bg-notice px-4 py-2 text-center text-[13px] font-medium text-warn",
        className
      )}
      {...props}
    />
  )
}

export { OfflineBanner }
