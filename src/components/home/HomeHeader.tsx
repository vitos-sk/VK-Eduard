import type { ReactNode } from "react";

import { LogoMark } from "@/components/brand/Logo";
import { STICKY_BAR } from "@/components/layout/stickyBar";
import { TOP_BAR_CORNER_PAD } from "@/components/layout/topBar";
import { cn } from "@/lib/utils";

/**
 * Шапка главной. Телефон: закреплённая тонкая полоса — знак логотипа и название страницы (значок чатов и аватар
 * справа стоят в оболочке, `TopBarCorner`, чтобы не мигать при переходах); под ней, уже в потоке, приветствие 22 / 600 (переносится, если имя длинное) и дата 13 px.
 * Десктоп: полосы нет (её заменяет сайдбар), остаются приветствие 24 и дата.
 * Лежит в контейнере с `px-4`, поэтому полоса выходит на всю ширину через `-mx-4`.
 */
export function HomeHeader({
  pageTitle,
  title,
  subtitle,
  className,
}: {
  /** Название страницы в полосе, например «Головна». */
  pageTitle: string;
  /** Приветствие. */
  title: ReactNode;
  subtitle: string;
  className?: string;
}) {
  return (
    <>
      <header className={cn("-mx-4 flex items-center gap-2.5 px-4 lg:hidden", STICKY_BAR, TOP_BAR_CORNER_PAD, className)}>
        <LogoMark size={28} className="shrink-0 text-ink" />
        <span className="min-w-0 flex-1 truncate text-[22px] font-semibold tracking-tight">{pageTitle}</span>
      </header>
      <div className="pt-3 lg:pt-0">
        <h1 className="text-[22px] leading-tight font-semibold tracking-tight lg:text-[24px]">{title}</h1>
        <p className="mt-0.5 text-[13px] text-ink-2">{subtitle}</p>
      </div>
    </>
  );
}
