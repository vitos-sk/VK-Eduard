import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface ScreenHeaderProps {
  title: string;
  /** Кнопка справа: «+», иконка календаря и т.п. */
  action?: ReactNode;
  className?: string;
}

/**
 * Шапка вкладки: крупный заголовок слева, необязательное действие справа.
 * Учитывает верхнюю безопасную зону.
 */
export function ScreenHeader({ title, action, className }: ScreenHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-3 px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-4",
        className,
      )}
    >
      <h1 className="text-[30px] font-extrabold tracking-tight">{title}</h1>
      {action}
    </header>
  );
}

interface BackHeaderProps {
  title: string;
  /** Куда ведёт стрелка «‹». */
  href: string;
  action?: ReactNode;
  className?: string;
}

/** Компактная шапка вложенной страницы: стрелка назад, заголовок по центру. */
export function BackHeader({ title, href, action, className }: BackHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center gap-2 px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4",
        className,
      )}
    >
      <Link
        href={href}
        aria-label={t.common.back}
        className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-text transition-colors duration-150 active:bg-surface-2 focus-visible:outline-2 focus-visible:outline-brand"
      >
        <ChevronLeft className="size-6" strokeWidth={2.4} aria-hidden />
      </Link>

      <h1 className="flex-1 text-center text-[17px] font-bold">{title}</h1>

      <div className="flex size-11 shrink-0 items-center justify-center">
        {action}
      </div>
    </header>
  );
}
