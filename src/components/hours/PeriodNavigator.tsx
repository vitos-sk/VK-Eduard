"use client";

import { CalendarDays } from "lucide-react";

import { Stepper } from "@/components/ui/stepper";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

interface PeriodNavigatorProps {
  /** «Середа, 30 липня 2025», «28 липня — 3 серпня», «Липень 2025». */
  title: string;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
}

/** Навигатор периода: стрелка назад, название периода, стрелка вперёд. */
export function PeriodNavigator({ title, onPrev, onNext, className }: PeriodNavigatorProps) {
  const t = useT();
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Stepper direction="earlier" label={t.hours.prevPeriod} onClick={onPrev} />

      <p className="flex min-w-0 flex-1 items-center justify-center gap-2 text-center text-[14px] font-medium">
        <CalendarDays className="size-4 shrink-0 text-primary" strokeWidth={1.9} aria-hidden />
        <span className="truncate">{title}</span>
      </p>

      <Stepper direction="later" label={t.hours.nextPeriod} onClick={onNext} />
    </div>
  );
}
