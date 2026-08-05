"use client";

import { useEffect, useState } from "react";
import { Play, Square } from "lucide-react";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDuration } from "@/lib/format";
import { t } from "@/lib/i18n";
import { TODAY_WORKED_SEC, daySheet } from "@/lib/mock/timesheet";
import { cn } from "@/lib/utils";

/**
 * Карточка «Робочий час»: статус, тикающий таймер, время начала
 * и кнопка завершения / старта рабочего дня.
 *
 * Состояние локальное: при перезагрузке возвращается к моку — так задумано.
 */
export function WorkTimeCard({ className }: { className?: string }) {
  const [workedSec, setWorkedSec] = useState(TODAY_WORKED_SEC);
  const [isRunning, setIsRunning] = useState(daySheet.status === "in_progress");

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const timerId = setInterval(() => {
      setWorkedSec((seconds) => seconds + 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [isRunning]);

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
        <span className="tabular font-bold text-text">{daySheet.startAt}</span>
      </p>

      <button
        type="button"
        onClick={() => setIsRunning((running) => !running)}
        className={cn(
          "mt-4 flex h-[56px] w-full items-center justify-center gap-2 rounded-[14px]",
          "bg-brand text-[15px] font-bold text-brand-ink",
          "transition-transform duration-150 active:scale-[0.98]",
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
