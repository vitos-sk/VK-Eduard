import { ChevronRight } from "lucide-react";

import { ObjectTicket } from "@/components/ui/object-ticket";
import { Ticket } from "@/components/ui/ticket";
import { fmt, formatHoursShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import { objectsStrings } from "@/lib/i18n/parts/objects";
import type { SiteObject } from "@/lib/types";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ObjectCardProps {
  object: SiteObject;
  /** Годин и людей за период — boss. */
  stats?: { minutes: number; workerCount: number };
  className?: string;
}

/**
 * Строка списка «Об'єкти»: плоский талон — название, вид работ («демо» или вид),
 * статус капсом, шеврон справа. Архивный объект помечен «Архів» вместо статуса.
 */
export function ObjectCard({ object, stats, className }: ObjectCardProps) {
  const caption = [
    object.kind || object.address,
    stats
      ? `${formatHoursShort(stats.minutes)} · ${fmt(objectsStrings.workersCount, { n: stats.workerCount })}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  if (object.archivedAt) {
    return (
      <Ticket asChild variant="flat" interactive className={cn("flex items-center gap-3", className)}>
        <Link href={`/objects/${object.id}`}>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] leading-snug font-medium">{object.name}</span>
            {caption && <span className="block truncate text-[12px] text-ink-2">{caption}</span>}
            <span className="mt-1 block text-[12px] font-semibold tracking-[0.04em] text-ink-2 uppercase">
              {t.objects.archivedBadge}
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-ink-3" strokeWidth={1.9} aria-hidden />
        </Link>
      </Ticket>
    );
  }

  return (
    <ObjectTicket
      href={`/objects/${object.id}`}
      name={object.name}
      caption={caption}
      status={object.status}
      className={className}
      trailing={<ChevronRight className="size-4 shrink-0 text-ink-3" strokeWidth={1.9} aria-hidden />}
    />
  );
}

