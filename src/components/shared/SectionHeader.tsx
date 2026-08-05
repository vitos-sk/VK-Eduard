import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  /** Ссылка справа, например «Дивитися всі ›». */
  action?: {
    label: string;
    href: string;
  };
  className?: string;
}

/** Заголовок секции внутри экрана + необязательная ссылка справа. */
export function SectionHeader({ title, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <h2 className="text-[20px] font-bold">{title}</h2>

      {action && (
        <Link
          href={action.href}
          className={cn(
            "flex shrink-0 items-center gap-0.5 py-2 text-[13px] font-semibold text-brand",
            "transition-opacity duration-150 active:opacity-70",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          )}
        >
          {action.label}
          <ChevronRight className="size-4" strokeWidth={2.4} aria-hidden />
        </Link>
      )}
    </div>
  );
}
