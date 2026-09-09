"use client";

import { Camera, MessageSquare } from "lucide-react";

import { MetaRow } from "@/components/shared/MetaRow";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Thumb } from "@/components/shared/Thumb";
import { fmt, formatDayMonth, fromDateKey } from "@/lib/format";
import { t } from "@/lib/i18n";
import { getObjectById } from "@/lib/mock/objects";
import type { Report } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Запасной градиент, если объект отчёта не найден среди моков. */
const fallbackGradient = ["#2F5227", "#182C13"] as const;

interface ReportCardProps {
  report: Report;
  /** Детальной страницы отчёта в этой фазе нет — по умолчанию заглушка. */
  onClick?: () => void;
  className?: string;
}

/** Карточка отчёта: широкая миниатюра, дата с интервалом, виды работ, мета-строка. */
export function ReportCard({
  report,
  onClick = () => {},
  className,
}: ReportCardProps) {
  const object = getObjectById(report.objectId);
  const gradient = object?.gradient ?? fallbackGradient;
  const dateLabel = formatDayMonth(fromDateKey(report.date));

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-[16px] border border-border bg-surface p-4 text-left",
        "transition-transform duration-150 active:scale-[0.98]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        className,
      )}
    >
      <Thumb name={report.objectName} gradient={gradient} size="wide" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[17px] font-bold">{report.objectName}</p>

        <p className="mt-0.5 truncate text-[13px] font-medium text-text-muted">
          {dateLabel} · {report.timeFrom} {t.common.dash} {report.timeTo}
        </p>

        {/* Статус — рядом с видами работ: в строке с названием бейдж
            не оставляет ему читаемой ширины на 390px. */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {report.workKinds.map((kind) => (
            <span
              key={kind}
              className="rounded-[8px] bg-surface-2 px-2 py-1 text-[11px] font-semibold text-text"
            >
              {t.workKind[kind]}
            </span>
          ))}
          <StatusBadge status={report.status} />
        </div>

        <MetaRow
          className="mt-2"
          items={[
            {
              icon: Camera,
              label: fmt(t.reports.photosCount, { n: report.photosCount }),
            },
            {
              icon: MessageSquare,
              label: fmt(t.reports.commentsCount, { n: report.commentsCount }),
            },
          ]}
        />
      </div>
    </button>
  );
}
