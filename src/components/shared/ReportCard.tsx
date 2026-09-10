import Link from "next/link";
import { Camera } from "lucide-react";

import { MetaRow } from "@/components/shared/MetaRow";
import { Thumb } from "@/components/shared/Thumb";
import { fmt, formatDayMonth, fromDateKey, minutesToTime } from "@/lib/format";
import { t } from "@/lib/i18n";
import { gradientForId } from "@/lib/siteGradient";
import { reportState } from "@/modules/entries/reportState";
import type { WorkEntryWithPhotos } from "@/modules/entries/types";
import { elapsedSecondsNow } from "@/modules/time/calc";
import { cn } from "@/lib/utils";

interface ReportCardProps {
  entry: WorkEntryWithPhotos;
  /** Имя объекта или `null`, если запись без объекта. */
  siteName: string | null;
  /** Подписанная ссылка на первое фото — `null`, если фото ещё нет. */
  thumbUrl: string | null;
  now: Date;
  className?: string;
}

/**
 * Карточка звіту: дата и часы в одной строке (DESIGN-SYSTEM.md, 4.5),
 * дальше — по состоянию: «Триває» просто показывает «з HH:mm», «Без опису» —
 * плашку и кнопку «Дописати», «Готовий» — текст описания и число фото.
 */
export function ReportCard({ entry, siteName, thumbUrl, now, className }: ReportCardProps) {
  const state = reportState(entry, entry.entry_photos.length);
  const dateLabel = formatDayMonth(fromDateKey(entry.work_date));
  const name = siteName ?? t.hours.noObject;

  const minutes =
    state === "ongoing"
      ? Math.floor(
          elapsedSecondsNow(
            entry.work_date,
            entry.started_at,
            entry.break_start,
            entry.break_end,
            now,
          ) / 60,
        )
      : (entry.total_minutes ?? 0);

  return (
    <Link
      href={`/reports/${entry.id}`}
      className={cn(
        "flex w-full items-start gap-3 rounded-[16px] border border-border bg-surface p-4 text-left",
        "transition-transform duration-150 active:scale-[0.98]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        state === "no_description" && "opacity-80",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-[15px] font-bold">{dateLabel}</p>
          <p className="tabular shrink-0 text-[15px] font-bold">
            {state === "ongoing"
              ? fmt(t.reports.ongoingSince, { time: entry.started_at })
              : `${minutesToTime(minutes)} ${t.units.hoursShort}`}
          </p>
        </div>

        <p className="mt-0.5 truncate text-[13px] font-medium text-text-muted">{name}</p>

        {state === "no_description" && (
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="rounded-[8px] bg-warning/12 px-2 py-1 text-[11px] font-bold tracking-[0.06em] text-warning uppercase">
              {t.reports.noDescriptionBadge}
            </span>
            {/* Не отдельная ссылка: вся карточка уже ведёт на /reports/[id],
                где «Дописати» и происходит (REPORTS.md, раздел 5). Вложенный
                <a> внутри <a> — невалидный HTML, поэтому здесь просто акцент. */}
            <span className="text-[13px] font-bold text-brand">
              {t.reports.addDescription}
            </span>
          </div>
        )}

        {state === "ready" && entry.description !== "" && (
          <p className="mt-2 line-clamp-2 text-[14px] leading-[1.4] font-medium text-text">
            {entry.description}
          </p>
        )}

        {entry.entry_photos.length > 1 && (
          <MetaRow
            className="mt-2"
            items={[
              {
                icon: Camera,
                label: fmt(t.reports.photosCount, { n: entry.entry_photos.length }),
              },
            ]}
          />
        )}
      </div>

      {thumbUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- подписанная ссылка Storage, не next/image-домен
        <img
          src={thumbUrl}
          alt=""
          loading="lazy"
          className="h-[84px] w-[104px] shrink-0 rounded-[12px] object-cover"
        />
      ) : (
        <Thumb name={name} gradient={gradientForId(entry.site_id ?? entry.id)} size="wide" />
      )}
    </Link>
  );
}
