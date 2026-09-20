"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Building2,
  CalendarDays,
  ChevronRight,
  Clock,
  FileText,
  Gauge,
  MapPin,
  Pause,
  Play,
  Square,
} from "lucide-react";
import { toast } from "sonner";

import { useOpenShift } from "@/components/layout/ShiftContext";
import { ObjectPickerDrawer } from "@/components/time/ObjectPickerDrawer";
import { PostShiftSiteDialog } from "@/components/home/PostShiftSiteDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDateShort, formatDuration, formatHoursShort, fromDateKey, fmt } from "@/lib/format";
import { t } from "@/lib/i18n";
import { getGoogleMapsDirectionsUrl } from "@/lib/utils";
import {
  endCurrentBreak,
  setEntrySite,
  startCurrentBreak,
  startShift,
  stopCurrentShift,
} from "@/modules/entries/actions";
import type { WorkEntry } from "@/modules/entries/types";
import type { Site } from "@/modules/sites/queries";
import { dateKeyOf, elapsedSecondsNow, hhmmOf } from "@/modules/time/calc";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** Мінімум із записів, потрібний для «Сьогодні» — не тягнемо фото. */
export type EntryForStats = Pick<WorkEntry, "site_id" | "work_date" | "ended_at" | "total_minutes">;

interface WorkTimeCardProps {
  sites: readonly Site[];
  entries: readonly EntryForStats[];
  className?: string;
}

/**
 * Карточка «Робочий день»: об'єкт/локація/дата/початок зліва, стислий
 * знімок дня справа, старт/стоп і перехід до звіту знизу. Об'єкт можна
 * обрати як до старту зміни, так і задним числом, поки вона йде —
 * `setEntrySite` дописує вже відкритий запис. Якщо зміну завершили без
 * об'єкта, `PostShiftSiteDialog` пропонує дописати його чи опис одразу
 * після «Завершити роботу», а не мовчки лишає запис висіти без контексту.
 */
export function WorkTimeCard({ sites, entries, className }: WorkTimeCardProps) {
  const openEntry = useOpenShift();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [now, setNow] = useState(() => new Date());
  const [isObjectPickerOpen, setIsObjectPickerOpen] = useState(false);
  const [pendingSiteId, setPendingSiteId] = useState<string | null>(null);
  const [postShiftEntryId, setPostShiftEntryId] = useState<string | null>(null);

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

  const currentSiteId = isRunning ? (openEntry?.site_id ?? null) : pendingSiteId;
  const selectedSite = currentSiteId ? (sites.find((site) => site.id === currentSiteId) ?? null) : null;

  const todayKey = dateKeyOf(now);
  const todayCompletedCount = useMemo(() => {
    const siteIds = new Set(
      entries
        .filter((entry) => entry.work_date === todayKey && entry.ended_at !== null && entry.site_id !== null)
        .map((entry) => entry.site_id as string),
    );
    return siteIds.size;
  }, [entries, todayKey]);

  const totalMinutesOnSite = useMemo(() => {
    if (!currentSiteId) return 0;
    return entries
      .filter((entry) => entry.site_id === currentSiteId)
      .reduce((sum, entry) => sum + (entry.total_minutes ?? 0), 0);
  }, [entries, currentSiteId]);

  const handleSiteSelect = (siteId: string) => {
    if (isRunning && openEntry) {
      startTransition(async () => {
        const result = await setEntrySite(openEntry.id, siteId);

        if (result.error) {
          toast(result.error);
          return;
        }

        router.refresh();
      });
      return;
    }

    setPendingSiteId(siteId);
  };

  const handleToggle = () => {
    startTransition(async () => {
      const clickTime = new Date();

      if (isRunning && openEntry) {
        const entryId = openEntry.id;
        const hadSite = openEntry.site_id !== null;

        const result = await stopCurrentShift(hhmmOf(clickTime));

        if (result.error) {
          toast(result.error);
          return;
        }

        if (!hadSite) {
          setPostShiftEntryId(entryId);
        }

        router.refresh();
        return;
      }

      const result = await startShift(pendingSiteId, dateKeyOf(clickTime), hhmmOf(clickTime));

      if (result.error) {
        toast(result.error);
        return;
      }

      setPendingSiteId(null);
      router.refresh();
    });
  };

  const handleTogglePause = () => {
    // Перерва в записі одна — друге натискання «Пауза» без пояснення
    // виглядало як зависла кнопка. Тепер вона завжди реагує, просто каже,
    // чому вдруге не можна, а не мовчки блокується `disabled`.
    if (!isOnBreak && breakUsed) {
      toast(t.hours.breakAlreadyTaken);
      return;
    }

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

  const dateValue = formatDateShort(openEntry ? fromDateKey(openEntry.work_date) : now);
  const startedValue = openEntry?.started_at?.slice(0, 5) ?? t.common.dash;

  return (
    <Card asChild><section className={cn("lg:p-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className={cn(
              "size-2 shrink-0 rounded-full",
              isRunning && !isOnBreak ? "bg-success" : isOnBreak ? "bg-warning" : "bg-text-dim",
            )}
          />
          <h2 className="text-[17px] font-bold">{t.home.workTime}</h2>
        </div>

        <StatusBadge status={isOnBreak ? "paused" : isRunning ? "in_progress" : "completed"} />
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] gap-x-4 lg:grid-cols-[1.2fr_auto_1fr]">
        <div className="flex flex-col divide-y divide-border">
          <InfoRow
            icon={Building2}
            label={t.home.objectLabel}
            value={selectedSite?.name ?? t.home.objectPlaceholder}
            onClick={() => setIsObjectPickerOpen(true)}
          />
          {selectedSite?.address && (
            <InfoRow
              icon={MapPin}
              label={t.home.locationLabel}
              value={selectedSite.address}
              onClick={() => window.open(getGoogleMapsDirectionsUrl(selectedSite.address as string), "_blank")}
            />
          )}
          <InfoRow icon={CalendarDays} label={t.home.dateLabel} value={dateValue} />
          <InfoRow icon={Clock} label={t.home.startedAt} value={startedValue} />
        </div>

        <div aria-hidden className="w-px bg-border" />

        <div className="flex flex-col">
          <p className="pt-1 pb-2 text-[11px] font-bold tracking-[0.04em] text-text-dim uppercase">
            {t.home.todayLabel}
          </p>

          <div className="flex flex-col divide-y divide-border">
            <InfoRow
              icon={Briefcase}
              label={t.home.todayCompleted}
              value={fmt(t.home.todayCompletedCount, { n: todayCompletedCount })}
            />
            <InfoRow
              icon={Gauge}
              label={t.home.totalOnSite}
              value={formatHoursShort(totalMinutesOnSite)}
              href={currentSiteId ? `/objects/${currentSiteId}` : undefined}
            />
          </div>
        </div>
      </div>

      {isRunning && (
        <p suppressHydrationWarning className="tabular mt-4 text-center text-[40px] leading-none font-extrabold tracking-[-0.02em] lg:text-[32px]">
          {formatDuration(workedSec)}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2">
        <Button size="xl" block onClick={handleToggle} disabled={isPending}>
          <ActionIcon className="size-[18px] fill-current" strokeWidth={2} aria-hidden />
          {isRunning ? t.home.finishWork : t.home.startWork}
        </Button>

        {isRunning && (
          <Button variant="secondary" block onClick={handleTogglePause} disabled={isPending}>
            <PauseIcon className="size-[18px] fill-current" strokeWidth={2} aria-hidden />
            {isOnBreak ? t.hours.resume : t.hours.pause}
          </Button>
        )}

        <Button asChild variant="outline" block>
          <Link href="/reports">
            <FileText className="size-[18px]" strokeWidth={2} aria-hidden />
            {t.home.viewReport}
          </Link>
        </Button>
      </div>

      <ObjectPickerDrawer
        open={isObjectPickerOpen}
        onOpenChange={setIsObjectPickerOpen}
        sites={sites}
        value={currentSiteId}
        onSelect={handleSiteSelect}
      />

      {postShiftEntryId && (
        <PostShiftSiteDialog
          open={postShiftEntryId !== null}
          onOpenChange={(open) => !open && setPostShiftEntryId(null)}
          entryId={postShiftEntryId}
          sites={sites}
        />
      )}
    </section></Card>
  );
}

interface InfoRowProps {
  icon: ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
  onClick?: () => void;
  href?: string;
}

/** Рядок «іконка → підпис/значення → шеврон» — той самий патерн полів, що й у `ManualTimeScreen`. */
function InfoRow({ icon: Icon, label, value, onClick, href }: InfoRowProps) {
  const isInteractive = Boolean(onClick || href);

  const content = (
    <div className="flex items-center gap-3 py-3">
      <Icon className="size-5 shrink-0 text-text-muted" strokeWidth={2} aria-hidden />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium text-text-muted">{label}</p>
        <p className="truncate text-[15px] font-bold">{value}</p>
      </div>

      {isInteractive && (
        <ChevronRight className="size-4 shrink-0 text-text-dim" strokeWidth={2.4} aria-hidden />
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="rounded-[8px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <Button variant="bare" size="bare" block onClick={onClick}>
        {content}
      </Button>
    );
  }

  return content;
}
