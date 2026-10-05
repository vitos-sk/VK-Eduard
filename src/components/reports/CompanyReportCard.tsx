"use client";

import Link from "next/link";

import { CompanyReportDeleteButton } from "@/components/reports/CompanyReportDeleteButton";
import { CardPhoto } from "@/components/ui/card-photo";
import { StampTag } from "@/components/ui/stamp-tag";
import { DateStub, Ticket, TicketBody } from "@/components/ui/ticket";
import { fmt } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { reportState } from "@/modules/reports/reportState";
import type { SiteReportWithNames } from "@/modules/reports/types";

interface CompanyReportCardProps {
  report: SiteReportWithNames;
  /** Подписанная ссылка на первое фото звіту; `null` — рамка-заглушка. */
  thumbUrl?: string | null;
  /** Викликається після успішного видалення — прибрати картку зі списку. */
  onDeleted: (reportId: string) => void;
}

/**
 * Талон звіту в компанійській стрічці: корінець із датою, види робіт,
 * автор · об'єкт · фото, штамп стану. Видалення — окрема кнопка поза посиланням,
 * щоб не вкладати інтерактивні елементи один в одного.
 */
export function CompanyReportCard({ report, thumbUrl = null, onDeleted }: CompanyReportCardProps) {
  const t = useT();
  const s = t.reportsUi;
  const state = reportState(report, report.photo_count);
  const siteName = report.site_name ?? s.feed.noSite;
  const title = report.category_labels.join(", ") || report.description || t.home.lastReport.noDescription;
  const meta = [
    report.author_full_name,
    siteName,
    report.photo_count > 0 ? fmt(s.feed.photosCount, { n: report.photo_count }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="relative">
      <Ticket asChild compact interactive className="overflow-hidden">
        <Link href={`/reports/${report.id}`}>
          <DateStub date={report.work_date} compact />
          <TicketBody className="flex min-w-0 flex-1 flex-col gap-1 py-2.5 pr-9">
            <span className="block truncate text-[14px] leading-snug font-medium">{title}</span>
            <span className="block truncate text-[12px] text-ink-2">{meta}</span>
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

      <CompanyReportDeleteButton
        reportId={report.id}
        onDeleted={onDeleted}
        className="absolute top-1/2 right-[104px] -translate-y-1/2"
      />
    </div>
  );
}
