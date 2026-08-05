import { t } from "@/lib/i18n";
import type { WorkStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Цвета статусов — раздел 3.4 плана.
 * Фон бейджа — цвет статуса с прозрачностью ~12%, текст — он же без прозрачности.
 */
const statusStyles: Record<WorkStatus, string> = {
  in_progress: "bg-success/12 text-success",
  not_started: "bg-surface-2 text-text-muted",
  completed: "bg-success/12 text-success",
  paused: "bg-warning/12 text-warning",
};

interface StatusBadgeProps {
  status: WorkStatus;
  className?: string;
}

/** Бейдж статуса: 11px/700, uppercase, tracking 0.06em, радиус 8px. */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-[8px] px-2 py-1",
        "text-[11px] font-bold tracking-[0.06em] uppercase whitespace-nowrap",
        statusStyles[status],
        className,
      )}
    >
      {t.status[status]}
    </span>
  );
}
