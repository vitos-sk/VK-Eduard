"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Pause, Play, Plus, Square } from "lucide-react";
import { toast } from "sonner";

import { t } from "@/lib/i18n";
import {
  endCurrentBreak,
  startCurrentBreak,
  startShift,
  stopCurrentShift,
} from "@/modules/entries/actions";
import { dateKeyOf, hhmmOf } from "@/modules/time/calc";
import type { WorkEntry } from "@/modules/entries/types";
import { cn } from "@/lib/utils";

interface DayActionsProps {
  /** Текущая открытая смена автора или `null`, если сейчас никто не работает. */
  openEntry: WorkEntry | null;
  /** Вызывается после успешного действия — родитель перезапрашивает данные. */
  onChanged: () => void;
  className?: string;
}

/** Кнопка старта/стопа смены плюс два вторичных действия: перерыв и ручной ввод. */
export function DayActions({ openEntry, onChanged, className }: DayActionsProps) {
  const [isPending, startTransition] = useTransition();

  const isRunning = openEntry !== null;
  const isOnBreak = openEntry !== null && openEntry.break_start !== null && openEntry.break_end === null;
  // Перерыв в записи один: если он уже был использован, второй раз не начать.
  const breakUsed = openEntry !== null && openEntry.break_start !== null && openEntry.break_end !== null;

  const run = (action: () => Promise<{ error: string | null }>) => {
    startTransition(async () => {
      const result = await action();

      if (result.error) {
        toast(result.error);
        return;
      }

      onChanged();
    });
  };

  const handleToggleWork = () => {
    const now = new Date();

    if (isRunning) {
      run(() => stopCurrentShift(hhmmOf(now)));
    } else {
      run(() => startShift(null, dateKeyOf(now), hhmmOf(now)));
    }
  };

  const handleTogglePause = () => {
    const now = new Date();

    run(() => (isOnBreak ? endCurrentBreak(hhmmOf(now)) : startCurrentBreak(hhmmOf(now))));
  };

  const MainIcon = isRunning ? Square : Play;
  const PauseIcon = isOnBreak ? Play : Pause;

  return (
    <div className={cn("space-y-3", className)}>
      <button
        type="button"
        onClick={handleToggleWork}
        disabled={isPending}
        className={cn(
          "flex h-[56px] w-full items-center justify-center gap-2 rounded-[14px]",
          "bg-brand text-[15px] font-bold text-brand-ink",
          "transition-transform duration-150 active:scale-[0.98]",
          "disabled:pointer-events-none disabled:opacity-60",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        )}
      >
        <MainIcon
          className="size-[18px] fill-current"
          strokeWidth={2}
          aria-hidden
        />
        {isRunning ? t.hours.finishWork : t.hours.startWork}
      </button>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleTogglePause}
          disabled={isPending || !isRunning || (breakUsed && !isOnBreak)}
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
          {isOnBreak ? t.hours.resume : t.hours.pause}
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
