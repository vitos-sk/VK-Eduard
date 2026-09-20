"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
    <Card padding="none" className={cn("flex items-center gap-2 px-2 py-2", className)}>
      <ArrowButton
        label={t.hours.prevPeriod}
        icon={ChevronLeft}
        onClick={onPrev}
      />

      <p className="flex min-w-0 flex-1 items-center justify-center gap-2 text-center text-[15px] font-bold">
        <CalendarDays
          className="size-[18px] shrink-0 text-primary"
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
    </Card>
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
    <Button
      variant="ghost"
      size="icon"
      className="rounded-ctl"
      onClick={onClick}
      aria-label={label}
    >
      <Icon className="size-5" strokeWidth={2.4} aria-hidden />
    </Button>
  );
}
