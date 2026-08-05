import { formatHoursShort, toDateKey } from "@/lib/format";
import { t } from "@/lib/i18n";
import { TODAY } from "@/lib/mock/user";
import type { PeriodSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

const TODAY_KEY = toDateKey(TODAY);

interface PeriodViewProps {
  summary: PeriodSummary;
  /** Показывать подпись под каждым n-м столбцом — для месяца их 31. */
  labelEvery?: number;
  className?: string;
}

/** Вкладки «Тиждень» и «Місяць»: сводка за период и столбчатая диаграмма по дням. */
export function PeriodView({
  summary,
  labelEvery = 1,
  className,
}: PeriodViewProps) {
  const maxMin = Math.max(...summary.bars.map((bar) => bar.workedMin), 1);

  return (
    <div className={cn("space-y-3", className)}>
      <section className="rounded-[16px] border border-border bg-surface p-4">
        <p className="tabular text-[34px] leading-none font-extrabold">
          {formatHoursShort(summary.totalMin)}
        </p>
        <p className="mt-1.5 text-[13px] font-medium text-text-muted">
          {t.hours.workedPeriod}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4">
          <PeriodCell
            label={t.hours.plan}
            value={formatHoursShort(summary.planMin)}
          />
          <PeriodCell
            label={t.hours.daysWorked}
            value={String(summary.daysWorked)}
          />
          <PeriodCell
            label={t.hours.average}
            value={formatHoursShort(summary.averageMin)}
          />
        </div>
      </section>

      <section className="rounded-[16px] border border-border bg-surface p-4">
        {/* Период уже подписан в навигаторе выше — здесь только столбцы. */}
        <div aria-hidden className="flex h-[140px] items-end gap-1">
          {summary.bars.map((bar) => {
            const isToday = bar.date === TODAY_KEY;
            const height =
              bar.workedMin === 0
                ? 4
                : Math.max(8, (bar.workedMin / maxMin) * 140);

            return (
              <div
                key={bar.date}
                style={{ height: `${height}px` }}
                className={cn(
                  "flex-1 rounded-[4px]",
                  bar.workedMin === 0
                    ? "bg-surface-2"
                    : isToday
                      ? "bg-brand"
                      : "bg-brand/45",
                )}
              />
            );
          })}
        </div>

        <div className="mt-2 flex gap-1">
          {summary.bars.map((bar, index) => (
            <span
              key={bar.date}
              className={cn(
                "tabular flex-1 text-center text-[11px] font-semibold",
                bar.date === TODAY_KEY ? "text-brand" : "text-text-dim",
              )}
            >
              {index % labelEvery === 0 ? bar.label : ""}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function PeriodCell({ label, value }: { label: string; value: string }) {
  return (
    // min-h у подписи держит значения на одной линии: «У середньому за день»
    // занимает две строки, остальные подписи — одну.
    <div className="flex h-full flex-col">
      <p className="min-h-[2.6em] text-[13px] leading-[1.3] font-medium text-text-muted">
        {label}
      </p>
      <p className="tabular mt-1 text-[15px] font-bold">{value}</p>
    </div>
  );
}
