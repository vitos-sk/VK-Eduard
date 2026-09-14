import type { LucideIcon } from "lucide-react";

interface StatTileProps {
  icon: LucideIcon;
  label: string;
  value: string;
}

/**
 * Одна stat-картка (число + підпис + іконка). Спільна для міні-дашборда на
 * «Головній» (`CompanyDashboard`) і повної сторінки `/dashboard`.
 */
export function StatTile({ icon: Icon, label, value }: StatTileProps) {
  return (
    <div className="rounded-[16px] border border-border bg-surface p-5">
      <Icon className="size-5 text-brand" strokeWidth={2} aria-hidden />
      <p className="tabular mt-3 text-[28px] font-extrabold tracking-tight">{value}</p>
      <p className="mt-1 text-[13px] font-semibold text-text-muted">{label}</p>
    </div>
  );
}
