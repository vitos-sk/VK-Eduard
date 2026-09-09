import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/lib/i18n";

export default function Loading() {
  return (
    <div className="pb-6">
      <ScreenHeader title={t.profile.title} />

      <Skeleton className="mx-4 h-[168px] rounded-[18px]" />
      <Skeleton className="mx-4 mt-6 h-14 rounded-[14px]" />
    </div>
  );
}
