import Link from "next/link";
import { MapPin } from "lucide-react";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { Thumb } from "@/components/shared/Thumb";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/i18n";
import type { SiteObject } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Компактна картка об'єкта для горизонтальної стрічки на головній. */
export function HomeObjectCard({
  object,
  className,
}: {
  object: SiteObject;
  className?: string;
}) {
  return (
    <Card asChild interactive elevated padding="sm" className={cn("flex flex-col gap-2", className)}>
      <Link href={`/objects/${object.id}`}>
        <Thumb
          name={object.name}
          gradient={object.gradient}
          photoUrl={object.photoUrl}
          size="md"
          className="h-24 w-full"
        />
        <StatusBadge status={object.status} className="self-start" />
        <p className="truncate text-[15px] font-bold">{object.name}</p>
        <p className="flex items-center gap-1 truncate text-[13px] font-medium text-text-muted">
          <MapPin className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
          <span className="truncate">{object.address || t.common.dash}</span>
        </p>
      </Link>
    </Card>
  );
}
