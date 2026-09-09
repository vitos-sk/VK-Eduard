import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/lib/i18n";

/** Заголовок вкладки настоящий и виден сразу, карточки объектов — скелетоны. */
export default function Loading() {
  return (
    <div className="pb-6">
      <ScreenHeader
        title={t.objects.title}
        action={<Skeleton className="size-11 rounded-full" />}
      />

      <div className="px-4">
        <Skeleton className="h-11 w-full rounded-[12px]" />
        <Skeleton className="mt-3 h-10 w-full rounded-[12px]" />

        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-[96px] w-full rounded-[16px]" />
          ))}
        </div>
      </div>
    </div>
  );
}
