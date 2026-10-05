"use client";

import Link from "next/link";

import { CardPhoto } from "@/components/ui/card-photo";
import { StampTag } from "@/components/ui/stamp-tag";
import { DateStub, Ticket, TicketBody } from "@/components/ui/ticket";
import { fmt } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { reportState } from "@/modules/reports/reportState";
import { categoryLabelsOf } from "@/modules/reports/categoryLabels";
import type { SiteReportWithPhotos, WorkCategory } from "@/modules/reports/types";
import { cn } from "@/lib/utils";

interface ReportCardProps {
  report: SiteReportWithPhotos;
  /** Имя объекта или `null`, если запись без объекта. */
  siteName: string | null;
  /** Категорії компанії — для показу міток по `category_ids`. */
  categories: readonly WorkCategory[];
  /** Подписанная ссылка на первое фото звіту; `null` — рамка-заглушка. */
  thumbUrl?: string | null;
  className?: string;
}

/**
 * Карточка звіту — талон с корешком (день и число). Строка: виды работ
 * (или текст описания), под ней объект и число фото; справа штамп состояния.
 * «Подано» — только у звіту, где есть описание или фото.
 */
export function ReportCard({ report, siteName, categories, thumbUrl = null, className }: ReportCardProps) {
  const t = useT();
  const state = reportState(report, report.report_photos.length);
  const name = siteName ?? t.hours.noObject;
  const labels = categoryLabelsOf(report, categories);
  const title = labels.join(", ") || report.description || t.home.lastReport.noDescription;
  const photos = report.report_photos.length;

  return (
    <Ticket asChild compact interactive className={cn("overflow-hidden", className)}>
      <Link href={`/reports/${report.id}`}>
        <DateStub date={report.work_date} compact />
        <TicketBody className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-2.5">
          <span className="block truncate text-[14px] leading-snug font-medium">{title}</span>
          <span className="block truncate text-[12px] text-ink-2">
            {photos > 0 ? `${name} · ${fmt(t.reports.photosCount, { n: photos })}` : name}
          </span>
          <StampTag
            variant={state === "ready" ? "submitted" : "notSubmitted"}
            className="mt-0.5"
          >
            {state === "ready" ? t.home.dayReport.submitted : t.reports.noDescriptionBadge}
          </StampTag>
        </TicketBody>
        <CardPhoto src={thumbUrl} />
      </Link>
    </Ticket>
  );
}
