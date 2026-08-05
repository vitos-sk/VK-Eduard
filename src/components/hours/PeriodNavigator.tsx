"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface PeriodNavigatorProps {
  /** «Середа, 30 липня 2025», «28 липня — 3 серпня», «Липень 2025». */
  title: string;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
}

/** Навигатор периода: «‹ 🗓 Середа, 30 липня 2025 ›». */
export function PeriodNavigator({
  title,
  onPrev,
  onNext,
  className,
}: PeriodNavigatorProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-[16px] border border-border bg-surface px-2 py-2",
        className,
      )}
    >
      <ArrowButton
        label={t.hours.prevPeriod}
        icon={ChevronLeft}
        onClick={onPrev}
      />

      <p className="flex min-w-0 flex-1 items-center justify-center gap-2 text-center text-[15px] font-bold">
        <CalendarDays
          className="size-[18px] shrink-0 text-brand"
          strokeWidth={2}
          aria-hidden
        />
        <span className="truncate">{title}</span>
      </p>

      <ArrowButton
        label={t.hours.nextPeriod}
        icon={ChevronRight}
        onClick={onNext}
      />
    </div>
  );
}

function ArrowButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: typeof ChevronLeft;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-[12px] text-text",
        "transition-colors duration-150 active:bg-surface-2",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
      )}
    >
      <Icon className="size-5" strokeWidth={2.4} aria-hidden />
    </button>
  );
}
