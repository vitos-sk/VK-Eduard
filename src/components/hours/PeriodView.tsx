"use client";

import { Ticket } from "@/components/ui/ticket";
import { formatHoursShort } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import type { PeriodSummary } from "@/lib/types";

interface PeriodViewProps {
  summary: PeriodSummary;
  className?: string;
}

/** Сумма часов за период: подпись 13 px и крупная цифра mono 30 / 600. */
export function PeriodView({ summary, className }: PeriodViewProps) {
  const t = useT();
  return (
    <Ticket asChild variant="flat" className={className}>
      <section>
        <p className="text-[13px] text-ink-2">{t.hours.workedPeriod}</p>
        <p className="tabular mt-0.5 text-[30px] leading-tight font-semibold">
          {formatHoursShort(summary.totalMin)}
        </p>
      </section>
    </Ticket>
  );
}
