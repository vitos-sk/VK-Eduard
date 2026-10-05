"use client";

import { ObjectTicket } from "@/components/ui/object-ticket";
import { useT } from "@/lib/i18n/client";
import type { SiteObject } from "@/lib/types";
import { categoryName } from "@/modules/reports/categoryLabels";

/** Талон объекта для горизонтальной ленты на главной: узкий, фото сверху вплотную к рамке. */
export function HomeObjectCard({
  object,
  className,
}: {
  object: SiteObject;
  className?: string;
}) {
  const t = useT();

  return (
    <ObjectTicket
      layout="stack"
      href={`/objects/${object.id}`}
      name={object.name}
      caption={object.kind ? categoryName(object.kind, t) : object.kind}
      status={object.status}
      photoUrl={object.photoUrl}
      className={className}
    />
  );
}
