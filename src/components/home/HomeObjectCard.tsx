import { ObjectTicket } from "@/components/ui/object-ticket";
import type { SiteObject } from "@/lib/types";

/** Талон объекта для горизонтальной ленты на главной: узкий, фото сверху вплотную к рамке. */
export function HomeObjectCard({
  object,
  className,
}: {
  object: SiteObject;
  className?: string;
}) {
  return (
    <ObjectTicket
      layout="stack"
      href={`/objects/${object.id}`}
      name={object.name}
      caption={object.kind}
      status={object.status}
      photoUrl={object.photoUrl}
      className={className}
    />
  );
}
