import { t } from "@/lib/i18n";
import type { WorkStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const statusVariant = {
  in_progress: "success",
  not_started: "neutral",
  completed: "success",
  paused: "warning",
} as const satisfies Record<WorkStatus, "success" | "neutral" | "warning">;

interface StatusBadgeProps {
  status: WorkStatus;
  className?: string;
}

/** Бейдж статуса объекта/смены: цвет берётся из варианта Badge, не локально. */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge variant={statusVariant[status]} dot className={className}>
      {t.status[status]}
    </Badge>
  );
}
