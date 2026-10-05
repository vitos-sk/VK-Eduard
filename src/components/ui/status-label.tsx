"use client";

import { useT } from "@/lib/i18n/client";
import type { WorkStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

const statusTone = {
  in_progress: "text-primary",
  not_started: "text-ink-2",
  completed: "text-ink-2",
  paused: "text-warn",
} as const satisfies Record<WorkStatus, string>

/** Статус капсом 12 / 600 без рамки: «В РОБОТІ», «НЕ РОЗПОЧАТО». */
function StatusLabel({
  status,
  className,
}: {
  status: WorkStatus
  className?: string
}) {
  const t = useT();
  return (
    <span
      data-slot="status-label"
      className={cn(
        "text-[12px] font-semibold tracking-[0.04em] whitespace-nowrap uppercase",
        statusTone[status],
        className
      )}
    >
      {t.status[status]}
    </span>
  )
}

export { StatusLabel }
