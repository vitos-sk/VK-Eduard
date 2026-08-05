"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Ключ группировки списка отчётов. */
export type ReportSort = "date" | "object" | "status";

const SORT_LABELS: Record<ReportSort, string> = {
  date: t.reports.sort.byDate,
  object: t.reports.sort.byObject,
  status: t.reports.sort.byStatus,
};

interface ReportsSortSelectProps {
  value: ReportSort;
  onChange: (value: ReportSort) => void;
  className?: string;
}

/** Пилюля-дропдаун «За датою ⌄» рядом с фильтрами по статусу. */
export function ReportsSortSelect({
  value,
  onChange,
  className,
}: ReportsSortSelectProps) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as ReportSort)}>
      <SelectTrigger
        aria-label={t.reports.sort.label}
        className={cn(
          "h-11 shrink-0 rounded-full border-0 bg-surface-2 px-4",
          "text-[14px] font-semibold text-text-muted data-[size=default]:h-11",
          "focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>

      <SelectContent className="border border-border bg-surface">
        {(Object.keys(SORT_LABELS) as ReportSort[]).map((key) => (
          <SelectItem key={key} value={key} className="text-[14px] font-medium">
            {SORT_LABELS[key]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
