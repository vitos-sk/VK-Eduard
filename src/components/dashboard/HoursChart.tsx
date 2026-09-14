"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

import { formatHoursShort } from "@/lib/format";
import type { HoursChartPoint } from "@/modules/dashboard/period";

interface HoursChartProps {
  data: readonly HoursChartPoint[];
  emptyLabel: string;
}

/**
 * Bar chart динаміки годин. `recharts` — єдина графічна залежність у
 * проєкті (додана саме під цей компонент), кастомізується під токени
 * застосунку через `fill`/`stroke` напряму — CSS-змінні тут не працюють,
 * бо `recharts` рендерить у SVG поза Tailwind-каскадом.
 */
export function HoursChart({ data, emptyLabel }: HoursChartProps) {
  const hasData = data.some((point) => point.minutes > 0);

  if (!hasData) {
    return (
      <p className="flex h-[220px] items-center justify-center text-[14px] font-medium text-text-muted">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data as HoursChartPoint[]} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            interval="preserveStartEnd"
          />
          <Tooltip
            formatter={(value: any) => formatHoursShort(value)}
            labelFormatter={(label: any) => label}
            contentStyle={{ borderRadius: 12, fontSize: 13 }}
          />
          <Bar dataKey="minutes" fill="var(--color-brand)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
