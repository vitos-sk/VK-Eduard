"use client";

import { BackHeader } from "@/components/layout/ScreenHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/lib/i18n/client";

export default function Loading() {
  const t = useT();
  return (
    <div className="pb-6">
      <BackHeader title={t.reportForm.title} href="/reports" />

      <div className="px-4 space-y-4">
        <Skeleton className="h-11 w-full rounded-ctl" />
        <Skeleton className="h-11 w-full rounded-ctl" />
        <Skeleton className="h-11 w-full rounded-ctl" />
        <Skeleton className="h-24 w-full rounded-ctl" />
      </div>
    </div>
  );
}
