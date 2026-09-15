"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, Square } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDuration } from "@/lib/format";
import { t } from "@/lib/i18n";
import {
  endCurrentBreak,
  startCurrentBreak,
  startShift,
  stopCurrentShift,
} from "@/modules/entries/actions";
import type { WorkEntry } from "@/modules/entries/types";
import { dateKeyOf, elapsedSecondsNow, hhmmOf } from "@/modules/time/calc";
import { cn } from "@/lib/utils";

interface WorkTimeCardProps {
  /** Открытая смена автора или `null` — источник правды на сервере. */
  openEntry: WorkEntry | null;
  className?: string;
}

/**
 * Карточка «Робочий час»: статус, тикающий таймер, время начала
 * и кнопка старта/стопа смены.
 *
 * Секунды не хранятся в состоянии — каждую секунду они заново считаются
 * из `openEntry` (реального начала смены в базе) и текущего момента.
 * Иначе после `router.refresh()` пришлось бы вручную ресинхронизировать
 * локальный счётчик с посвежевшим пропом.
 */
export function WorkTimeCard({ openEntry, className }: WorkTimeCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [now, setNow] = useState(() => new Date());

  const isRunning = openEntry !== null;
  const isOnBreak = openEntry !== null && openEntry.break_start !== null && openEntry.break_end === null;
  // Перерыв в записи один: если он уже был использован, второй раз не начать.
  const breakUsed = openEntry !== null && openEntry.break_start !== null && openEntry.break_end !== null;

  useEffect(() => {
    if (!isRunning) return;

    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  const workedSec = openEntry
    ? elapsedSecondsNow(
        openEntry.work_date,
        openEntry.started_at,
        openEntry.break_start,
        openEntry.break_end,
        now,
      )
    : 0;

  const handleToggle = () => {
    startTransition(async () => {
      const clickTime = new Date();

      const result = isRunning
        ? await stopCurrentShift(hhmmOf(clickTime))
        : await startShift(null, dateKeyOf(clickTime), hhmmOf(clickTime));

      if (result.error) {
        toast(result.error);
        return;
      }

      router.refresh();
    });
  };

  const handleTogglePause = () => {
    startTransition(async () => {
      const clickTime = new Date();

      const result = isOnBreak
        ? await endCurrentBreak(hhmmOf(clickTime))
        : await startCurrentBreak(hhmmOf(clickTime));

      if (result.error) {
        toast(result.error);
        return;
      }

      router.refresh();
    });
  };

  const ActionIcon = isRunning ? Square : Play;
  const PauseIcon = isOnBreak ? Play : Pause;

  return (
    <section
      className={cn(
        "rounded-[16px] border border-border bg-surface p-4",
        "lg:flex lg:items-center lg:justify-between lg:gap-8 lg:p-5",
        className,
      )}
    >
      <div className="lg:flex lg:flex-1 lg:items-center lg:gap-8">
        <div className="flex items-center justify-between gap-3 lg:justify-start lg:gap-3">
          <h2 className="text-[17px] font-bold">{t.home.workTime}</h2>
          <StatusBadge status={isOnBreak ? "paused" : isRunning ? "in_progress" : "completed"} />
        </div>

        <p className="tabular mt-3 text-[56px] leading-none font-extrabold tracking-[-0.02em] lg:mt-0 lg:text-[40px]">
          {formatDuration(workedSec)}
        </p>

        <p className="mt-3 text-[13px] font-medium text-text-muted lg:mt-0">
          {t.home.startedAt}{" "}
          <span className="tabular font-bold text-text">
            {openEntry?.started_at ?? t.common.dash}
          </span>
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-3 lg:mt-0 lg:flex-row lg:items-center">
        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          className={cn(
            "flex h-[56px] w-full items-center justify-center gap-2 rounded-[14px]",
            "bg-brand text-[15px] font-bold text-brand-ink",
            "transition-transform duration-150 active:scale-[0.98]",
            "disabled:pointer-events-none disabled:opacity-60",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
            "lg:h-12 lg:w-auto lg:min-w-[220px] lg:px-6 lg:transition-colors lg:hover:brightness-95 lg:active:scale-100",
          )}
        >
          <ActionIcon
            className="size-[18px] fill-current"
            strokeWidth={2}
            aria-hidden
          />
          {isRunning ? t.home.finishWork : t.home.startWork}
        </button>

        {isRunning ? (
          <button
            type="button"
            onClick={handleTogglePause}
            disabled={isPending || (breakUsed && !isOnBreak)}
            className={cn(
              "flex h-[56px] w-full items-center justify-center gap-2 rounded-[14px]",
              "border border-border bg-surface-2 text-[15px] font-bold text-text",
              "transition-transform duration-150 active:scale-[0.98]",
              "disabled:pointer-events-none disabled:opacity-40",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              "lg:h-12 lg:w-auto lg:min-w-[160px] lg:px-6 lg:transition-colors lg:hover:brightness-95 lg:active:scale-100",
            )}
          >
            <PauseIcon
              className="size-[18px] fill-current"
              strokeWidth={2}
              aria-hidden
            />
            {isOnBreak ? t.hours.resume : t.hours.pause}
          </button>
        ) : null}
      </div>
    </section>
  );
}
