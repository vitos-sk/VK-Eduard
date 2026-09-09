import { BackHeader } from "@/components/layout/ScreenHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/lib/i18n";

export default function Loading() {
  return (
    <div className="pb-6">
      <BackHeader title={t.reportForm.title} href="/reports" />

      <div className="px-4 space-y-4">
        <Skeleton className="h-11 w-full rounded-[12px]" />
        <Skeleton className="h-11 w-full rounded-[12px]" />
        <Skeleton className="h-11 w-full rounded-[12px]" />
        <Skeleton className="h-24 w-full rounded-[12px]" />
      </div>
    </div>
  );
}
