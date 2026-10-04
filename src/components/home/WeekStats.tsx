import { Clock, FileText, HardHat } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatHoursShort } from "@/lib/format";
import { t } from "@/lib/i18n";

interface WeekStatsProps {
  minutes: number;
  reportsCount: number;
  objectsCount: number;
  className?: string;
}

/** Підсумок тижня працівника: години, звіти, об'єкти. */
export function WeekStats({ minutes, reportsCount, objectsCount, className }: WeekStatsProps) {
  const copy = t.home.week;
  const items: readonly { icon: LucideIcon; value: string; label: string }[] = [
    { icon: Clock, value: formatHoursShort(minutes), label: copy.worked },
    { icon: FileText, value: String(reportsCount), label: copy.reports },
    { icon: HardHat, value: String(objectsCount), label: copy.objects },
  ];

  return (
    <Card elevated padding="none" className={className}>
      <dl className="grid grid-cols-3 divide-x divide-border py-4">
        {items.map(({ icon: Icon, value, label }) => (
          <div key={label} className="flex flex-col items-center gap-1 px-2 text-center">
            <Icon className="size-6 text-primary" strokeWidth={2} aria-hidden />
            <dd className="text-[17px] leading-tight font-extrabold">{value}</dd>
            <dt className="text-[12px] font-medium text-text-muted">{label}</dt>
          </div>
        ))}
      </dl>
    </Card>
  );
}
