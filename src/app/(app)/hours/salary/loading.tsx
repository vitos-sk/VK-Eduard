"use client";

import { BackHeader } from "@/components/layout/ScreenHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/lib/i18n/client";

export default function Loading() {
  const t = useT();

  return (
    <div className="pb-6">
      <BackHeader title={t.hours.salaryCalcTitle} href="/hours" />

      <div className="space-y-3 px-4 lg:mx-auto lg:max-w-[640px] lg:px-0">
        <Skeleton className="h-10 w-full rounded-ctl" />
        <Skeleton className="h-[120px] w-full rounded-card" />
        <Skeleton className="h-[220px] w-full rounded-card" />
      </div>
    </div>
  );
}
