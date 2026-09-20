"use client";

import Link from "next/link";
import { Camera, User } from "lucide-react";

import { CompanyReportDeleteButton } from "@/components/reports/CompanyReportDeleteButton";
import { MetaRow } from "@/components/shared/MetaRow";
import { fmt, formatDayMonth, fromDateKey } from "@/lib/format";
import { reportsStrings as s } from "@/lib/i18n/parts/reports";
import { t } from "@/lib/i18n";
import { reportState } from "@/modules/reports/reportState";
import type { SiteReportWithNames } from "@/modules/reports/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const MAX_VISIBLE_CATEGORIES = 2;

interface CompanyReportCardProps {
  report: SiteReportWithNames;
  /** Викликається після успішного видалення — прибрати картку зі списку. */
  onDeleted: (reportId: string) => void;
}

/**
 * Картка звіту в компанійській стрічці адмінки: дата, об'єкт, автор,
 * категорії, кількість фото. Клік веде на існуючу деталку `/reports/[id]`,
 * видалення — окрема кнопка поза посиланням, щоб не вкладати інтерактивні
 * елементи один в одного.
 */
export function CompanyReportCard({ report, onDeleted }: CompanyReportCardProps) {
  const state = reportState(report, report.photo_count);
  const dateLabel = formatDayMonth(fromDateKey(report.work_date));
  const siteName = report.site_name ?? s.feed.noSite;
  const visibleLabels = report.category_labels.slice(0, MAX_VISIBLE_CATEGORIES);
  const extraCount = report.category_labels.length - visibleLabels.length;

  return (
    <div className="relative">
      <Link
        href={`/reports/${report.id}`}
        className={cn(
          "block rounded-[12px] border border-border bg-surface-2 p-4 pr-12",
          "transition-transform duration-150 active:scale-[0.99]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          state === "no_description" && "opacity-80",
        )}
      >
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-[15px] font-bold">{dateLabel}</p>
        </div>

        <p className="mt-0.5 truncate text-[13px] font-medium text-text-muted">{siteName}</p>

        <MetaRow
          className="mt-1.5"
          items={[
            { icon: User, label: report.author_full_name },
            ...(report.photo_count > 0
              ? [{ icon: Camera, label: fmt(s.feed.photosCount, { n: report.photo_count }) }]
              : []),
          ]}
        />

        {visibleLabels.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {visibleLabels.map((label) => (
              <span
                key={label}
                className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-bold text-text-muted"
              >
                {label}
              </span>
            ))}
            {extraCount > 0 && (
              <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-bold text-text-muted">
                {`+${extraCount}`}
              </span>
            )}
          </div>
        )}

        {state === "no_description" && (
          <Badge variant="warning" className="mt-2">{t.reports.noDescriptionBadge}</Badge>
        )}

        {state === "ready" && report.description !== "" && (
          <p className="mt-2 line-clamp-2 text-[14px] leading-[1.4] font-medium text-text">
            {report.description}
          </p>
        )}
      </Link>

      <CompanyReportDeleteButton
        reportId={report.id}
        onDeleted={onDeleted}
        className="absolute top-3 right-3"
      />
    </div>
  );
}
