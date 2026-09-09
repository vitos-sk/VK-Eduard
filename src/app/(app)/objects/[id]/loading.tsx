import { BackHeader } from "@/components/layout/ScreenHeader";
import { Skeleton } from "@/components/ui/skeleton";

/** Название объекта ещё не загружено — шапка временно без заголовка. */
export default function Loading() {
  return (
    <div className="pb-6">
      <BackHeader title="" href="/objects" />

      <div className="px-4">
        <Skeleton className="h-[128px] w-full rounded-[16px]" />

        <Skeleton className="mt-6 h-6 w-40" />

        <div className="mt-3 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-[96px] w-full rounded-[16px]" />
          ))}
        </div>
      </div>
    </div>
  );
}
