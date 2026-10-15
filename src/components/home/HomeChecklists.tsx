"use client";

import Link from "next/link";
import { ListChecks } from "lucide-react";

import { ChecklistRow } from "@/components/checklists/ChecklistRow";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Ticket } from "@/components/ui/ticket";
import { useT } from "@/lib/i18n/client";
import type { ChecklistListEntry } from "@/modules/checklists/queries";

/** Блок «Чеклисти» на главной: пара свежих невыполненных; нет ни одного — приглашение создать первый. */
export function HomeChecklists({ entries, className }: { entries: ChecklistListEntry[]; className?: string }) {
  const t = useT();
  const h = t.home.checklists;

  return (
    <section className={className}>
      <SectionHeader title={h.title} action={{ label: t.home.viewAll, href: "/checklists" }} />

      <div className="mt-2 flex flex-col gap-2">
        {entries.length > 0 ? (
          entries.map((entry) => <ChecklistRow key={entry.id} entry={entry} />)
        ) : (
          <Ticket asChild variant="flat" interactive className="flex items-center gap-3">
            <Link href="/checklists/new">
              <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-md border border-edge bg-stub text-primary">
                <ListChecks className="size-5" strokeWidth={1.9} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">{h.emptyTitle}</span>
                <span className="block text-[12px] text-ink-2">{h.emptyHint}</span>
              </span>
            </Link>
          </Ticket>
        )}
      </div>
    </section>
  );
}
