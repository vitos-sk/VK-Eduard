import type { ReactNode } from "react";

import { LogoMark } from "@/components/brand/Logo";
import { AvatarLink } from "@/components/layout/AvatarLink";
import { cn } from "@/lib/utils";

/**
 * Шапка главной: приветствие 22 / 600, под ним дата 13 px, справа аватар-инициалы.
 * Слева маленький знак логотипа (на десктопе его заменяет логотип в сайдбаре). Справа: значок чатов и аватар;
 * на десктопе оба заменяет боковая панель.
 */
export function HomeHeader({
  initials,
  title,
  subtitle,
  trailing,
  className,
}: {
  initials: string;
  title: ReactNode;
  subtitle: string;
  /** Что стоит левее аватара: значок чатов с числом непрочитанных. */
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex items-start justify-between gap-3 pt-[calc(env(safe-area-inset-top)+1.5rem)] lg:pt-0",
        className,
      )}
    >
      <LogoMark size={28} className="mt-0.5 text-ink lg:hidden" />
      <div className="min-w-0 flex-1">
        <h1 className="text-[22px] leading-tight font-semibold tracking-tight lg:text-[24px]">
          {title}
        </h1>
        <p className="mt-0.5 text-[13px] text-ink-2">{subtitle}</p>
      </div>
      <div className="mt-0.5 flex shrink-0 items-center gap-2.5 lg:hidden">
        {trailing}
        <AvatarLink initials={initials} />
      </div>
    </header>
  );
}
