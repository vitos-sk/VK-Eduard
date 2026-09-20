import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

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
    <Card padding="lg">
      <Icon className="size-5 text-primary" strokeWidth={2} aria-hidden />
      <p className="tabular mt-3 text-[28px] font-extrabold tracking-tight">{value}</p>
      <p className="mt-1 text-[13px] font-semibold text-text-muted">{label}</p>
    </Card>
  );
}
