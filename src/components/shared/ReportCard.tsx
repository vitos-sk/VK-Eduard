import Link from "next/link";
import { Camera } from "lucide-react";

import { MetaRow } from "@/components/shared/MetaRow";
import { Thumb } from "@/components/shared/Thumb";
import { fmt, formatDayMonth, fromDateKey } from "@/lib/format";
import { t } from "@/lib/i18n";
import { gradientForId } from "@/lib/siteGradient";
import { reportState } from "@/modules/reports/reportState";
import type { SiteReportWithPhotos, WorkCategory } from "@/modules/reports/types";
import { cn } from "@/lib/utils";

interface ReportCardProps {
  report: SiteReportWithPhotos;
  /** Имя объекта или `null`, если запись без объекта. */
  siteName: string | null;
  /** Категорії компанії — для показу міток по `category_ids`. */
  categories: readonly WorkCategory[];
  /** Подписанная ссылка на первое фото — `null`, если фото ещё нет. */
  thumbUrl: string | null;
  className?: string;
}

const MAX_VISIBLE_CATEGORIES = 2;

/**
 * Карточка звіту: дата, об'єкт, до двох міток категорій, дальше — по стану:
 * «Без опису» — плашка й кнопка «Дописати», «Готовий» — текст опису й фото.
 */
export function ReportCard({ report, siteName, categories, thumbUrl, className }: ReportCardProps) {
  const state = reportState(report, report.report_photos.length);
  const dateLabel = formatDayMonth(fromDateKey(report.work_date));
  const name = siteName ?? t.hours.noObject;

  const labelById = new Map(categories.map((category) => [category.id, category.label] as const));
  const categoryLabels = report.category_ids.map((id) => labelById.get(id)).filter((label): label is string => Boolean(label));
  const visibleLabels = categoryLabels.slice(0, MAX_VISIBLE_CATEGORIES);
  const extraCount = categoryLabels.length - visibleLabels.length;

  return (
    <Link
      href={`/reports/${report.id}`}
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
        </div>

        <p className="mt-0.5 truncate text-[13px] font-medium text-text-muted">{name}</p>

        {visibleLabels.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {visibleLabels.map((label) => (
              <span
                key={label}
                className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-text-muted"
              >
                {label}
              </span>
            ))}
            {extraCount > 0 && (
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-text-muted">
                {`+${extraCount}`}
              </span>
            )}
          </div>
        )}

        {state === "no_description" && (
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="rounded-[8px] bg-warning/12 px-2 py-1 text-[11px] font-bold tracking-[0.06em] text-warning uppercase">
              {t.reports.noDescriptionBadge}
            </span>
            <span className="text-[13px] font-bold text-brand">
              {t.reports.addDescription}
            </span>
          </div>
        )}

        {state === "ready" && report.description !== "" && (
          <p className="mt-2 line-clamp-2 text-[14px] leading-[1.4] font-medium text-text">
            {report.description}
          </p>
        )}

        {report.report_photos.length > 1 && (
          <MetaRow
            className="mt-2"
            items={[
              {
                icon: Camera,
                label: fmt(t.reports.photosCount, { n: report.report_photos.length }),
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
        <Thumb name={name} gradient={gradientForId(report.site_id ?? report.id)} size="wide" />
      )}
    </Link>
  );
}
