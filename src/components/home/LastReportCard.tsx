import Link from "next/link";

import { StampTag } from "@/components/ui/stamp-tag";
import { DateStub, Ticket, TicketBody } from "@/components/ui/ticket";
import { fmt, formatHoursShort } from "@/lib/format";
import { t } from "@/lib/i18n";

interface LastReportCardProps {
  reportId: string;
  workDate: string;
  siteName: string;
  /** Названия видов работ звіту через запятую. */
  worksLabel: string;
  minutes: number;
  photosCount: number;
  /** У звіті є опис або фото. */
  isReady: boolean;
}

/** Последний звіт: корешок с днём, виды работ, объект, фото, время и штамп. */
export function LastReportCard({
  reportId,
  workDate,
  siteName,
  worksLabel,
  minutes,
  photosCount,
  isReady,
}: LastReportCardProps) {
  const copy = t.home.lastReport;

  return (
    <Ticket asChild compact interactive>
      <Link href={`/reports/${reportId}`}>
        <DateStub date={workDate} compact />
        <TicketBody className="flex items-center gap-2.5">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] leading-snug font-medium">
              {worksLabel || copy.noDescription}
            </span>
            <span className="block truncate text-[12px] text-ink-2">
              {siteName} · {fmt(copy.photos, { n: photosCount })}
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-end gap-1">
            <span className="tabular text-[14px] font-semibold">{formatHoursShort(minutes)}</span>
            {isReady && <StampTag variant="submitted">{t.home.dayReport.submitted}</StampTag>}
          </span>
        </TicketBody>
      </Link>
    </Ticket>
  );
}
