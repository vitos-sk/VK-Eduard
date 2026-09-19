import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface KpiCellProps {
  icon: LucideIcon;
  label: string;
  value: string;
  muted?: boolean;
}

function KpiCell({ icon: Icon, label, value, muted }: KpiCellProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 p-3 lg:p-4">
      <Icon className="size-3.5 shrink-0 text-text-dim" strokeWidth={2} aria-hidden />
      <p
        className={cn(
          "tabular truncate text-[18px] font-extrabold tracking-tight lg:text-[26px]",
          muted && "text-text-dim",
        )}
      >
        {value}
      </p>
      <p className="text-[11px] leading-[1.3] font-semibold text-text-muted lg:text-[13px]">{label}</p>
    </div>
  );
}

interface TeamKpiStripProps {
  cells: readonly KpiCellProps[];
}

/**
 * Компактна смуга KPI: одна картка, комірки розділені хейрлайнами замість
 * трьох однакових плиток-«крапок» — так нульове значення («0 хв») не займає
 * стільки ж місця, скільки й змістовне («1 активний»).
 */
export function TeamKpiStrip({ cells }: TeamKpiStripProps) {
  return (
    <div
      className="grid rounded-[16px] border border-border bg-surface"
      style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
    >
      {cells.map((cell, index) => (
        <div
          key={cell.label}
          className={cn(index > 0 && "border-l border-border")}
        >
          <KpiCell {...cell} />
        </div>
      ))}
    </div>
  );
}
