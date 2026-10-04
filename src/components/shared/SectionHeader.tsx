import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  /** Ссылка справа, например «Дивитися всі». */
  action?: {
    label: string;
    href: string;
  };
  /** Значение справа вместо ссылки, например сумма недели (mono). */
  trailing?: ReactNode;
  className?: string;
}

/** Заголовок секции внутри экрана + необязательная ссылка или значение справа. */
export function SectionHeader({ title, action, trailing, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <h2 className="text-[13px] font-medium text-ink-2 lg:text-[20px] lg:font-semibold lg:text-ink">
        {title}
      </h2>

      {trailing}

      {action && (
        <Link
          href={action.href}
          className={cn(
            "relative shrink-0 text-[13px] font-semibold text-primary outline-none before:absolute before:-inset-y-3 before:-inset-x-2 before:content-['']",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          )}
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
