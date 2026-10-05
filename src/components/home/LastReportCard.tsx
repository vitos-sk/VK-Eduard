"use client";

import Link from "next/link";

import { CardPhoto } from "@/components/ui/card-photo";
import { StampTag } from "@/components/ui/stamp-tag";
import { DateStub, Ticket, TicketBody } from "@/components/ui/ticket";
import { fmt, formatHoursShort } from "@/lib/format";
import { useT } from "@/lib/i18n/client";

interface LastReportCardProps {
  reportId: string;
  workDate: string;
  siteName: string;
  /** Названия видов работ звіту через запятую. */
  worksLabel: string;
  minutes: number;
  photosCount: number;
  /** Подписанная ссылка на первое фото звіту. */
  thumbUrl?: string | null;
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
  thumbUrl = null,
  isReady,
}: LastReportCardProps) {
  const t = useT();
  const copy = t.home.lastReport;

  return (
    <Ticket asChild compact interactive className="overflow-hidden">
      <Link href={`/reports/${reportId}`}>
        <DateStub date={workDate} compact />
        <TicketBody className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-2.5">
          <span className="block truncate text-[14px] leading-snug font-medium">
            {worksLabel || copy.noDescription}
          </span>
          <span className="block truncate text-[12px] text-ink-2">
            {siteName} · {fmt(copy.photos, { n: photosCount })} ·{" "}
            <span className="tabular">{formatHoursShort(minutes)}</span>
          </span>
          {isReady && (
            <StampTag variant="submitted" className="mt-0.5">
              {t.home.dayReport.submitted}
            </StampTag>
          )}
        </TicketBody>
        <CardPhoto src={thumbUrl} />
      </Link>
    </Ticket>
  );
}
