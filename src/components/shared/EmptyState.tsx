import type { LucideIcon } from "lucide-react";
import { SearchX } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Одна кнопка действия (`Button`). */
  action?: ReactNode;
  className?: string;
}

/** Пустое состояние: линейная иконка 40 px, одна строка, одна кнопка. */
export function EmptyState({
  title,
  description,
  icon: Icon = SearchX,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-10 text-center",
        className,
      )}
    >
      <Icon className="size-10 text-ink-3" strokeWidth={1.5} aria-hidden />

      <div className="space-y-1">
        <p className="text-[15px] font-semibold">{title}</p>
        {description && <p className="text-[13px] text-ink-2">{description}</p>}
      </div>

      {action}
    </div>
  );
}
