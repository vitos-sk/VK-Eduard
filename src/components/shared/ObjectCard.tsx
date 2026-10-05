"use client";

import { ObjectTicket } from "@/components/ui/object-ticket";
import { fmt, formatHoursShort } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import type { SiteObject } from "@/lib/types";

interface ObjectCardProps {
  object: SiteObject;
  /** Годин и людей за период — boss. */
  stats?: { minutes: number; workerCount: number };
  /** Справа поверх карточки стоит кнопка-меню (шеф). */
  reserveMenuSpace?: boolean;
  className?: string;
}

/**
 * Строка списка «Об'єкти»: плоский талон — название, вид работ («демо» или вид),
 * статус капсом и горизонтальное фото справа вплотную к рамке.
 * Нет фото — рамка с иконкой «нет изображения». Архивный объект помечен «Архів».
 */
export function ObjectCard({ object, stats, reserveMenuSpace, className }: ObjectCardProps) {
  const t = useT();
  const caption = [
    object.kind || object.address,
    stats
      ? `${formatHoursShort(stats.minutes)} · ${fmt(t.objectsUi.workersCount, { n: stats.workerCount })}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <ObjectTicket
      href={`/objects/${object.id}`}
      name={object.name}
      caption={caption}
      status={object.status}
      photoUrl={object.photoUrl}
      reserveMenuSpace={reserveMenuSpace}
      archivedLabel={object.archivedAt ? t.objects.archivedBadge : undefined}
      className={className}
    />
  );
}
