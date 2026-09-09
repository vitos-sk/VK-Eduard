"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, Square } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDuration } from "@/lib/format";
import { t } from "@/lib/i18n";
import { startShift, stopCurrentShift } from "@/modules/entries/actions";
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

  const ActionIcon = isRunning ? Square : Play;

  return (
    <section
      className={cn(
        "rounded-[16px] border border-border bg-surface p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-bold">{t.home.workTime}</h2>
        <StatusBadge status={isRunning ? "in_progress" : "completed"} />
      </div>

      <p className="tabular mt-3 text-[56px] leading-none font-extrabold tracking-[-0.02em]">
        {formatDuration(workedSec)}
      </p>

      <p className="mt-3 text-[13px] font-medium text-text-muted">
        {t.home.startedAt}{" "}
        <span className="tabular font-bold text-text">
          {openEntry?.started_at ?? t.common.dash}
        </span>
      </p>

      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={cn(
          "mt-4 flex h-[56px] w-full items-center justify-center gap-2 rounded-[14px]",
          "bg-brand text-[15px] font-bold text-brand-ink",
          "transition-transform duration-150 active:scale-[0.98]",
          "disabled:pointer-events-none disabled:opacity-60",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        )}
      >
        <ActionIcon
          className="size-[18px] fill-current"
          strokeWidth={2}
          aria-hidden
        />
        {isRunning ? t.home.finishWork : t.home.startWork}
      </button>
    </section>
  );
}
