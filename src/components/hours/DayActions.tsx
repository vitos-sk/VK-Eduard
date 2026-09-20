"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pause, Play, Plus, Square } from "lucide-react";
import { toast } from "sonner";

import { PostShiftSiteDialog } from "@/components/home/PostShiftSiteDialog";
import { t } from "@/lib/i18n";
import {
  endCurrentBreak,
  startCurrentBreak,
  startShift,
  stopCurrentShift,
} from "@/modules/entries/actions";
import { dateKeyOf, hhmmOf } from "@/modules/time/calc";
import type { WorkEntry } from "@/modules/entries/types";
import type { Site } from "@/modules/sites/queries";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface DayActionsProps {
  /** Текущая открытая смена автора или `null`, если сейчас никто не работает. */
  openEntry: WorkEntry | null;
  /** Активні об'єкти — для модалки «Де ви сьогодні працювали?» після завершення. */
  sites: readonly Site[];
  /** Вызывается после успешного действия — родитель перезапрашивает данные. */
  onChanged: () => void;
  className?: string;
}

/** Кнопка старта/стопа смены плюс два вторичных действия: перерыв и ручной ввод. */
export function DayActions({ openEntry, sites, onChanged, className }: DayActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [postShiftEntryId, setPostShiftEntryId] = useState<string | null>(null);

  const isRunning = openEntry !== null;
  const isOnBreak = openEntry !== null && openEntry.break_start !== null && openEntry.break_end === null;
  // Перерыв в записи один: если он уже был использован, второй раз не начать.
  const breakUsed = openEntry !== null && openEntry.break_start !== null && openEntry.break_end !== null;

  const run = (action: () => Promise<{ error: string | null }>, onSuccess?: () => void) => {
    startTransition(async () => {
      const result = await action();

      if (result.error) {
        toast(result.error);
        return;
      }

      onSuccess?.();
      onChanged();
    });
  };

  const handleToggleWork = () => {
    const now = new Date();

    if (openEntry) {
      const entryId = openEntry.id;
      const hadSite = openEntry.site_id !== null;

      run(
        () => stopCurrentShift(hhmmOf(now)),
        () => {
          // Той самий сценарій, що й на «Головній»: зміну закрили без
          // об'єкта — одразу питаємо, де працювали.
          if (!hadSite) setPostShiftEntryId(entryId);
        },
      );
    } else {
      run(() => startShift(null, dateKeyOf(now), hhmmOf(now)));
    }
  };

  const handleTogglePause = () => {
    // Друга перерва за зміну неможлива — кнопка не «мертва», а пояснює це.
    if (!isOnBreak && breakUsed) {
      toast(t.hours.breakAlreadyTaken);
      return;
    }

    const now = new Date();

    run(() => (isOnBreak ? endCurrentBreak(hhmmOf(now)) : startCurrentBreak(hhmmOf(now))));
  };

  const MainIcon = isRunning ? Square : Play;
  const PauseIcon = isOnBreak ? Play : Pause;

  return (
    <div className={cn("space-y-3", className)}>
      <Button size="xl" block onClick={handleToggleWork} disabled={isPending}>
        <MainIcon
          className="size-[18px] fill-current"
          strokeWidth={2}
          aria-hidden
        />
        {isRunning ? t.hours.finishWork : t.hours.startWork}
      </Button>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" size="xl" onClick={handleTogglePause} disabled={isPending || !isRunning}>
          <PauseIcon
            className="size-[18px] fill-current"
            strokeWidth={2}
            aria-hidden
          />
          {isOnBreak ? t.hours.resume : t.hours.pause}
        </Button>

        <Button asChild variant="secondary" size="xl" className="px-2 text-center text-[13px]">
          <Link href="/time/manual">
            <Plus className="size-[18px] shrink-0" strokeWidth={2.4} aria-hidden />
            {t.hours.addManually}
          </Link>
        </Button>
      </div>

      {postShiftEntryId && (
        <PostShiftSiteDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setPostShiftEntryId(null);
              onChanged();
            }
          }}
          entryId={postShiftEntryId}
          sites={sites}
        />
      )}
    </div>
  );
}
