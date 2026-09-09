import { BackHeader } from "@/components/layout/ScreenHeader";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="pb-6">
      <BackHeader title="" href="/reports" />

      <div className="px-4">
        <Skeleton className="h-[220px] w-full rounded-[16px]" />
        <Skeleton className="mt-4 h-6 w-2/3" />
        <Skeleton className="mt-2 h-4 w-1/2" />
        <Skeleton className="mt-4 h-24 w-full rounded-[16px]" />
      </div>
    </div>
  );
}
