import { ObjectTicket } from "@/components/ui/object-ticket";
import type { SiteObject } from "@/lib/types";

/** Талон объекта для горизонтальной ленты на главной. */
export function HomeObjectCard({
  object,
  className,
}: {
  object: SiteObject;
  className?: string;
}) {
  return (
    <ObjectTicket
      href={`/objects/${object.id}`}
      name={object.name}
      caption={object.kind}
      status={object.status}
      className={className}
    />
  );
}
