import Link from "next/link";

import { Button } from "@/components/ui/button";
import { HoursRuler } from "@/components/ui/hours-ruler";
import { ProgressPips } from "@/components/ui/progress-pips";
import { StampTag } from "@/components/ui/stamp-tag";
import { DateStub, Ticket, TicketBody, TicketFoot } from "@/components/ui/ticket";
import { formatHoursShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface DayReportCardProps {
  /** Сегодня. */
  date: Date;
  /** Отработано сегодня, минуты. */
  minutes: number;
  /** Норма на день, минуты (`profile.daily_norm_minutes`). */
  normMinutes: number;
  /** Объект сегодняшней смены, если он есть. */
  siteName: string | null;
  /** Id сегодняшнего звіту, якщо він уже поданий; інакше `null`. */
  reportId: string | null;
  /** У поданого звіту є фото. */
  hasPhotos: boolean;
  className?: string;
}

/** Первый невыполненный шаг дня: Години → Звіт → Фото (3 — всё сделано). */
function currentStep(minutes: number, reportId: string | null, hasPhotos: boolean): number {
  if (minutes <= 0) return 0;
  if (!reportId) return 1;
  if (!hasPhotos) return 2;
  return 3;
}

/** Талон дня: часы с линейкой нормы, три шага и главное действие (создать/посмотреть звіт). */
export function DayReportCard({
  date,
  minutes,
  normMinutes,
  siteName,
  reportId,
  hasPhotos,
  className,
}: DayReportCardProps) {
  const copy = t.home.dayReport;
  const isSubmitted = reportId !== null;
  const steps = [t.home.progress.hours, t.home.progress.report, t.home.progress.photo];

  return (
    <Ticket variant="notch" className={cn(className)}>
      <DateStub date={date} />
      <TicketBody>
        <p className="text-[13px] text-ink-2">{t.hours.workedToday}</p>
        <div className="mt-0.5 flex items-baseline justify-between gap-2">
          <span className="tabular text-[30px] leading-tight font-semibold">
            {formatHoursShort(minutes)}
          </span>
          {siteName && <span className="truncate text-[13px] text-ink-2">{siteName}</span>}
        </div>
        <HoursRuler minutes={minutes} normMinutes={normMinutes} />
      </TicketBody>

      <TicketFoot>
        <ProgressPips steps={steps} current={currentStep(minutes, reportId, hasPhotos)} />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] text-ink-2">{copy.title}</span>
          <StampTag variant={isSubmitted ? "submitted" : "notSubmitted"}>
            {isSubmitted ? copy.submitted : copy.notSubmitted}
          </StampTag>
        </div>
        <Button asChild block>
          <Link href={isSubmitted ? `/reports/${reportId}` : "/reports/new"}>
            {isSubmitted ? copy.view : copy.create}
          </Link>
        </Button>
      </TicketFoot>
    </Ticket>
  );
}
