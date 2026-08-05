"use client";

import Link from "next/link";
import { Pause, Play, Plus, Square } from "lucide-react";

import { t } from "@/lib/i18n";
import type { WorkStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DayActionsProps {
  status: WorkStatus;
  /** Завершает день или начинает новый, если он уже завершён. */
  onToggleWork: () => void;
  /** Ставит на паузу или снимает с неё. */
  onTogglePause: () => void;
  className?: string;
}

/** Кнопка завершения дня плюс два вторичных действия: пауза и ручной ввод. */
export function DayActions({
  status,
  onToggleWork,
  onTogglePause,
  className,
}: DayActionsProps) {
  const isFinished = status === "completed";
  const isPaused = status === "paused";
  const MainIcon = isFinished ? Play : Square;
  const PauseIcon = isPaused ? Play : Pause;

  return (
    <div className={cn("space-y-3", className)}>
      <button
        type="button"
        onClick={onToggleWork}
        className={cn(
          "flex h-[56px] w-full items-center justify-center gap-2 rounded-[14px]",
          "bg-brand text-[15px] font-bold text-brand-ink",
          "transition-transform duration-150 active:scale-[0.98]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        )}
      >
        <MainIcon
          className="size-[18px] fill-current"
          strokeWidth={2}
          aria-hidden
        />
        {isFinished ? t.hours.startWork : t.hours.finishWork}
      </button>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onTogglePause}
          disabled={isFinished}
          className={cn(
            "flex h-[56px] items-center justify-center gap-2 rounded-[14px]",
            "border border-border bg-surface-2 text-[15px] font-bold text-text",
            "transition-transform duration-150 active:scale-[0.98]",
            "disabled:pointer-events-none disabled:opacity-40",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          )}
        >
          <PauseIcon
            className="size-[18px] fill-current"
            strokeWidth={2}
            aria-hidden
          />
          {isPaused ? t.hours.resume : t.hours.pause}
        </button>

        <Link
          href="/time/manual"
          className={cn(
            "flex h-[56px] items-center justify-center gap-1.5 rounded-[14px] px-2 text-center",
            "border border-border bg-surface-2 text-[13px] font-bold text-text",
            "transition-transform duration-150 active:scale-[0.98]",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          )}
        >
          <Plus className="size-[18px] shrink-0" strokeWidth={2.4} aria-hidden />
          {t.hours.addManually}
        </Link>
      </div>
    </div>
  );
}
