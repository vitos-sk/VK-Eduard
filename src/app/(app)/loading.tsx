import { STICKY_BAR } from "@/components/layout/stickyBar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Мгновенная заглушка главной, пока сервер собирает профиль, объекты
 * и записи. Без неё переход на «Головну» выглядел зависанием — экран
 * молчал, пока не придут все данные разом.
 */
export default function Loading() {
  return (
    <div className="px-4 pb-6">
      <div className={cn("-mx-4 flex items-center gap-2.5 px-4", STICKY_BAR)}>
        <Skeleton className="size-7 shrink-0 rounded-sm" />
        <Skeleton className="h-6 w-24 flex-1" />
        <Skeleton className="size-8 rounded-md" />
        <Skeleton className="size-8 rounded-md" />
      </div>

      <div className="pt-3">
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="mt-2 h-4 w-1/2" />
      </div>

      <Skeleton className="mt-5 h-[132px] w-full rounded-card" />

      <div className="mt-6 flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-16" />
      </div>

      <div className="mt-3 space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-[96px] w-full rounded-card" />
        ))}
      </div>
    </div>
  );
}
