import Link from "next/link";
import { CalendarDays, ChevronRight, FileText, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface DayReportCardProps {
  /** Id сьогоднішнього звіту, якщо він уже поданий; інакше `null`. */
  reportId: string | null;
  className?: string;
}

/** Головна дія дня: подати звіт за сьогодні (або переглянути вже поданий). */
export function DayReportCard({ reportId, className }: DayReportCardProps) {
  const copy = t.home.dayReport;
  const isSubmitted = reportId !== null;

  return (
    <Card elevated padding="lg" className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-[14px] font-semibold text-text-muted">
          <CalendarDays className="size-5 text-primary" strokeWidth={2} aria-hidden />
          {copy.today}
        </div>
        <Badge variant={isSubmitted ? "success" : "danger"} dot>
          {isSubmitted ? copy.submitted : copy.notSubmitted}
        </Badge>
      </div>

      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[22px] leading-tight font-extrabold">{copy.title}</h2>
          <p className="mt-1 text-[14px] font-medium text-text-muted">{copy.hint}</p>
        </div>
        <span
          aria-hidden
          className="flex size-14 shrink-0 items-center justify-center rounded-card bg-surface-2 text-primary"
        >
          <FileText className="size-7" strokeWidth={2} />
        </span>
      </div>

      <Button asChild size="xl" block>
        <Link href={isSubmitted ? `/reports/${reportId}` : "/reports/new"}>
          {!isSubmitted && <Plus className="size-5" strokeWidth={2.6} aria-hidden />}
          <span className="flex-1 text-center">{isSubmitted ? copy.view : copy.create}</span>
          <ChevronRight className="size-5" strokeWidth={2.4} aria-hidden />
        </Link>
      </Button>
    </Card>
  );
}
