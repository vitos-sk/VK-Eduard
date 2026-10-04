import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/lib/i18n";

export default function Loading() {
  return (
    <div className="pb-6">
      <ScreenHeader
        title={t.hours.title}
        action={<Skeleton className="size-8 rounded-md" />}
      />

      <div className="px-4">
        <Skeleton className="h-10 w-full rounded-ctl" />
        <Skeleton className="mt-4 h-[100px] w-full rounded-card" />

        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-[72px] w-full rounded-card" />
          ))}
        </div>
      </div>
    </div>
  );
}
