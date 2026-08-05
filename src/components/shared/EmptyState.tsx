import type { LucideIcon } from "lucide-react";
import { SearchX } from "lucide-react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
}

/** Пустое состояние списка: иконка в круге, заголовок, подпись. */
export function EmptyState({
  title,
  description,
  icon: Icon = SearchX,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-surface-2 text-text-dim">
        <Icon className="size-7" strokeWidth={2} aria-hidden />
      </span>

      <div className="space-y-1">
        <p className="text-[17px] font-bold">{title}</p>
        {description && (
          <p className="text-[13px] font-medium text-text-muted">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
