import type { ReactNode } from "react";

import { AvatarLink } from "@/components/layout/AvatarLink";
import { cn } from "@/lib/utils";

/**
 * Шапка главной: приветствие 22 / 600, под ним дата 13 px, справа аватар-инициалы.
 * Логотип и колокольчика нет: логотип в сайдбаре, уведомлений в приложении нет.
 */
export function HomeHeader({
  initials,
  title,
  subtitle,
  className,
}: {
  initials: string;
  title: ReactNode;
  subtitle: string;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex items-start justify-between gap-3 pt-[calc(env(safe-area-inset-top)+1.5rem)] lg:pt-0",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-[22px] leading-tight font-semibold tracking-tight lg:text-[24px]">
          {title}
        </h1>
        <p className="mt-0.5 text-[13px] text-ink-2">{subtitle}</p>
      </div>
      <AvatarLink initials={initials} className="mt-0.5 lg:hidden" />
    </header>
  );
}
