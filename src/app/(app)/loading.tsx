import { Skeleton } from "@/components/ui/skeleton";

/**
 * Мгновенная заглушка главной, пока сервер собирает профиль, объекты
 * и записи. Без неё переход на «Головну» выглядел зависанием — экран
 * молчал, пока не придут все данные разом.
 */
export default function Loading() {
  return (
    <div className="px-4 pb-6">
      <div className="flex items-center justify-between gap-3 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
        <Skeleton className="h-5 w-24" />
        <div className="flex items-center gap-2">
          <Skeleton className="size-11 rounded-full" />
          <Skeleton className="size-11 rounded-full" />
        </div>
      </div>

      <div className="mt-6">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="mt-2 h-4 w-1/2" />
      </div>

      <Skeleton className="mt-5 h-[132px] w-full rounded-[16px]" />

      <div className="mt-6 flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-16" />
      </div>

      <div className="mt-3 space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-[96px] w-full rounded-[16px]" />
        ))}
      </div>
    </div>
  );
}
