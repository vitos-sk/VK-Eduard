import type { LucideIcon } from "lucide-react";
import { Fragment } from "react";

import { cn } from "@/lib/utils";

export interface MetaItem {
  icon: LucideIcon;
  label: string;
}

interface MetaRowProps {
  items: readonly MetaItem[];
  className?: string;
}

/** Строка мета-информации с иконками: «8 фото · 2 звіти». */
export function MetaRow({ items, className }: MetaRowProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-text-muted",
        className,
      )}
    >
      {items.map((item, index) => {
        const Icon = item.icon;

        return (
          <Fragment key={item.label}>
            {index > 0 && <span aria-hidden>·</span>}
            <span className="flex min-w-0 items-center gap-1">
              <Icon className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
              <span className="truncate">{item.label}</span>
            </span>
          </Fragment>
        );
      })}
    </div>
  );
}
