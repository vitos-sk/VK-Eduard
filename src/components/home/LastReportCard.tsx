import Link from "next/link";
import { ChevronRight, Clock, FileText, Image as ImageIcon, MapPin } from "lucide-react";

import { MetaRow } from "@/components/shared/MetaRow";
import { Thumb } from "@/components/shared/Thumb";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { fmt, formatDateFull, formatHoursShort, fromDateKey } from "@/lib/format";
import { t } from "@/lib/i18n";
import { gradientForId } from "@/lib/siteGradient";

interface LastReportCardProps {
  reportId: string;
  workDate: string;
  siteId: string | null;
  siteName: string;
  siteAddress: string;
  thumbUrl: string | null;
  minutes: number;
  photosCount: number;
  worksCount: number;
  /** У звіті є опис або фото. */
  isReady: boolean;
}

/** Останній звіт працівника: фото, об'єкт, години, фото, види робіт. */
export function LastReportCard({
  reportId,
  workDate,
  siteId,
  siteName,
  siteAddress,
  thumbUrl,
  minutes,
  photosCount,
  worksCount,
  isReady,
}: LastReportCardProps) {
  const copy = t.home.lastReport;

  return (
    <Card asChild interactive elevated padding="sm" className="flex items-center gap-3">
      <Link href={`/reports/${reportId}`}>
        <Thumb
          name={siteName}
          gradient={gradientForId(siteId ?? reportId)}
          photoUrl={thumbUrl}
          size="wide"
          className="size-24 shrink-0"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[12px] font-medium text-text-muted">
              {formatDateFull(fromDateKey(workDate))}
            </p>
            <Badge variant={isReady ? "success" : "neutral"} className="shrink-0">
              {isReady ? t.home.dayReport.submitted : copy.noDescription}
            </Badge>
          </div>
          <p className="mt-0.5 truncate text-[16px] font-bold">{siteName}</p>
          <p className="flex items-center gap-1 truncate text-[13px] font-medium text-text-muted">
            <MapPin className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
            <span className="truncate">{siteAddress || t.common.dash}</span>
          </p>
          <MetaRow
            className="mt-1.5 flex-wrap gap-y-0.5"
            items={[
              { icon: Clock, label: formatHoursShort(minutes) },
              { icon: ImageIcon, label: fmt(copy.photos, { n: photosCount }) },
              { icon: FileText, label: fmt(copy.works, { n: worksCount }) },
            ]}
          />
        </div>

        <ChevronRight className="size-5 shrink-0 text-text-dim" strokeWidth={2.4} aria-hidden />
      </Link>
    </Card>
  );
}
