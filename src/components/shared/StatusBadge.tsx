import { StatusLabel } from "@/components/ui/status-label";
import type { WorkStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: WorkStatus;
  className?: string;
}

/** Статус объекта/смены капсом (12 / 600): цвет зависит от статуса, не от местной раскраски. */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  return <StatusLabel status={status} className={className} />;
}
