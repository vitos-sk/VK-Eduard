"use client";

import Link from "next/link";
import { Camera, User } from "lucide-react";

import { AdminDeleteReportButton } from "@/components/more/admin/reports/AdminDeleteReportButton";
import { MetaRow } from "@/components/shared/MetaRow";
import { fmt, formatDayMonth, fromDateKey } from "@/lib/format";
import { t } from "@/lib/i18n";
import { reportState } from "@/modules/reports/reportState";
import type { SiteReportWithNames } from "@/modules/reports/types";
import { cn } from "@/lib/utils";

const MAX_VISIBLE_CATEGORIES = 2;

interface AdminReportCardProps {
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
export function AdminReportCard({ report, onDeleted }: AdminReportCardProps) {
  const state = reportState(report, report.photo_count);
  const dateLabel = formatDayMonth(fromDateKey(report.work_date));
  const siteName = report.site_name ?? t.admin.reports.noSite;
  const visibleLabels = report.category_labels.slice(0, MAX_VISIBLE_CATEGORIES);
  const extraCount = report.category_labels.length - visibleLabels.length;

  return (
    <div className="relative">
      <Link
        href={`/reports/${report.id}`}
        className={cn(
          "block rounded-[12px] border border-border bg-surface-2 p-4 pr-12",
          "transition-transform duration-150 active:scale-[0.99]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
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
              ? [{ icon: Camera, label: fmt(t.admin.reports.photosCount, { n: report.photo_count }) }]
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
          <span className="mt-2 inline-block rounded-[8px] bg-warning/12 px-2 py-1 text-[11px] font-bold tracking-[0.06em] text-warning uppercase">
            {t.reports.noDescriptionBadge}
          </span>
        )}

        {state === "ready" && report.description !== "" && (
          <p className="mt-2 line-clamp-2 text-[14px] leading-[1.4] font-medium text-text">
            {report.description}
          </p>
        )}
      </Link>

      <AdminDeleteReportButton
        reportId={report.id}
        onDeleted={onDeleted}
        className="absolute top-3 right-3"
      />
    </div>
  );
}
