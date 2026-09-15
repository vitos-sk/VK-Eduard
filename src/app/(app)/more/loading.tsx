import { BackHeader } from "@/components/layout/ScreenHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/lib/i18n";

export default function Loading() {
  return (
    <div className="pb-6">
      <BackHeader title={t.profile.title} href="/" />

      <div className="flex flex-col gap-6 px-4 lg:mx-auto lg:max-w-[480px]">
        <Skeleton className="h-[82px] rounded-[16px]" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-[14px]" />
          ))}
        </div>
        <Skeleton className="h-14 rounded-[14px]" />
      </div>
    </div>
  );
}
