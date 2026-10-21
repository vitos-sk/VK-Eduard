"use client";

import Link from "next/link";
import { ListChecks } from "lucide-react";

import { DeleteChecklistButton } from "@/components/checklists/DeleteChecklistButton";
import { Badge } from "@/components/ui/badge";
import { ProgressPips } from "@/components/ui/progress-pips";
import { Ticket } from "@/components/ui/ticket";
import { fmt } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { isComplete } from "@/modules/checklists/progress";
import type { ChecklistListEntry } from "@/modules/checklists/queries";

/**
 * Строка списка чеклистов: название, от кого и по какому объекту, прогресс сегментами, метка «Нове» / «Готово».
 * `deletable` — справа красная корзина: удалить чеклист, не открывая его (экран «Чеклисти»).
 */
export function ChecklistRow({
  entry,
  className,
  deletable = false,
}: {
  entry: ChecklistListEntry;
  className?: string;
  deletable?: boolean;
}) {
  const t = useT();
  const c = t.checklists;
  const complete = isComplete(entry.progress);
  const isNew = entry.isReceived && entry.progress.done === 0;

  const subtitle = [
    entry.isReceived ? (entry.senderName ? fmt(c.from, { name: entry.senderName }) : null) : c.ownMark,
    entry.siteName ?? c.noSite,
    !entry.isReceived && entry.sentCount > 0 ? fmt(c.sentTo, { n: entry.sentCount }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const card = (
    <Ticket asChild variant="flat" interactive className={cn("flex min-w-0 flex-1 items-center gap-3", !deletable && className)}>
      <Link href={`/checklists/${entry.id}`}>
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-md border border-edge bg-stub text-primary"
        >
          <ListChecks className="size-5" strokeWidth={1.9} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{entry.title}</span>
          <span className="block truncate text-[12px] text-ink-2">{subtitle}</span>
          <ProgressPips
            className="mt-1.5 w-24"
            done={entry.progress.done}
            total={entry.progress.total}
            label={fmt(c.view.progress, { done: entry.progress.done, total: entry.progress.total })}
          />
        </span>

        <span className="flex shrink-0 flex-col items-end gap-1">
          {isNew && <Badge variant="accent">{c.newBadge}</Badge>}
          {complete && <Badge variant="success">{c.doneBadge}</Badge>}
          <span className="tabular text-[13px] text-ink-2">
            {entry.progress.done}/{entry.progress.total}
          </span>
        </span>
      </Link>
    </Ticket>
  );

  if (!deletable) return card;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {card}
      <DeleteChecklistButton checklistId={entry.id} display="icon" />
    </div>
  );
}
