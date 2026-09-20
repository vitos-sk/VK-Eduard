import Link from "next/link";
import { Camera, ChevronRight, Clock, FileText, Users } from "lucide-react";

import { MetaRow } from "@/components/shared/MetaRow";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Thumb } from "@/components/shared/Thumb";
import { fmt, formatHoursShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import { objectsStrings } from "@/lib/i18n/parts/objects";
import type { SiteObject } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ObjectCardProps {
  object: SiteObject;
  /** Стрелка «›» справа — для списка на экране «Об'єкти». */
  showChevron?: boolean;
  /** Години й людей за період — boss (метрики з адмінки). */
  stats?: { minutes: number; workerCount: number };
  className?: string;
}

/** Карточка стройплощадки: миниатюра, название, адрес, мета-строка и статус. */
export function ObjectCard({
  object,
  showChevron = false,
  stats,
  className,
}: ObjectCardProps) {
  return (
    <Card
      asChild
      interactive
      elevated
      className={cn(
        "flex w-full items-stretch gap-3",
        "lg:flex-col lg:items-stretch lg:gap-0 lg:overflow-hidden lg:p-0",
        "lg:hover:-translate-y-0.5 lg:hover:border-border-strong lg:hover:shadow-md lg:active:scale-100",
        object.archivedAt && "opacity-60",
        className,
      )}
    >
    <Link href={`/objects/${object.id}`}>
      <Thumb
        name={object.name}
        gradient={object.gradient}
        photoUrl={object.photoUrl}
        size="md"
        className="h-auto w-32 self-stretch lg:h-[150px] lg:w-full lg:self-auto lg:rounded-none"
      />

      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5 lg:block lg:p-4">
        <div>
          <p className="truncate text-[17px] font-bold">{object.name}</p>
          <p className="mt-0.5 truncate text-[13px] font-medium text-text-muted">
            {object.address || t.common.dash}
          </p>
        </div>

        {/* Статус — в нижней строке: рядом с названием бейдж не оставляет
            ему читаемой ширины на 390px. Если не влезает и здесь —
            переносится на свою строку, ничего не обрезая. */}
        <div className="mt-0 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 lg:mt-2">
          <MetaRow
            className={stats ? "flex-wrap gap-y-0.5" : "shrink-0"}
            items={[
              {
                icon: Camera,
                label: fmt(t.objects.photosCount, { n: object.photosCount }),
              },
              {
                icon: FileText,
                label: fmt(t.objects.reportsCount, { n: object.reportsCount }),
              },
              ...(stats
                ? [
                    { icon: Clock, label: formatHoursShort(stats.minutes) },
                    {
                      icon: Users,
                      label: fmt(objectsStrings.workersCount, { n: stats.workerCount }),
                    },
                  ]
                : []),
            ]}
          />
          {object.archivedAt ? (
            <Badge>{t.objects.archivedBadge}</Badge>
          ) : (
            <StatusBadge status={object.status} />
          )}
        </div>
      </div>

      {showChevron && (
        <ChevronRight
          className="my-auto size-5 shrink-0 text-text-dim lg:hidden"
          strokeWidth={2.4}
          aria-hidden
        />
      )}
    </Link>
    </Card>
  );
}
