"use client";

import Link from "next/link";
import { ListChecks, Plus } from "lucide-react";

import { ChecklistRow } from "@/components/checklists/ChecklistRow";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SegmentedTabs, type SegmentedOption } from "@/components/shared/SegmentedTabs";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";
import { useSessionState } from "@/lib/nav/useSessionState";
import { countByFilter, filterEntries, isChecklistFilter, type ChecklistFilter } from "@/modules/checklists/filter";
import type { ChecklistListEntry } from "@/modules/checklists/queries";

const filterCodec = {
  encode: (value: ChecklistFilter) => value,
  decode: (raw: unknown) => (isChecklistFilter(raw) ? raw : undefined),
};

/** `/checklists`: свои и присланные чеклисты, фильтры-чипсы сверху, кнопка «Новий». */
export function ChecklistsScreen({ entries }: { entries: ChecklistListEntry[] }) {
  const t = useT();
  const c = t.checklists;
  const [filter, setFilter] = useSessionState<ChecklistFilter>("checklists-filter", "all", filterCodec);

  const counts = countByFilter(entries);
  const options: SegmentedOption<ChecklistFilter>[] = [
    { value: "all", label: `${c.filters.all} · ${counts.all}` },
    { value: "mine", label: `${c.filters.mine} · ${counts.mine}` },
    { value: "received", label: `${c.filters.received} · ${counts.received}` },
    { value: "done", label: `${c.filters.done} · ${counts.done}` },
  ];
  const visible = filterEntries(entries, filter);

  return (
    <div className="pb-6 lg:mx-auto lg:max-w-[640px]">
      <ScreenHeader
        title={c.title}
        action={
          <Button asChild size="sm">
            <Link href="/checklists/new">
              <Plus className="size-4" strokeWidth={1.9} aria-hidden />
              {c.new}
            </Link>
          </Button>
        }
      />

      <div className="px-4 lg:px-0">
        {entries.length > 0 && (
          <SegmentedTabs variant="chips" label={c.title} options={options} value={filter} onChange={setFilter} className="-mt-1" />
        )}

        {entries.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title={c.empty.title}
            description={c.empty.hint}
            action={
              <Button asChild>
                <Link href="/checklists/new">{c.empty.create}</Link>
              </Button>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState icon={ListChecks} title={c.empty.filtered} />
        ) : (
          <div className="mt-1 flex flex-col gap-2">
            {visible.map((entry) => (
              <ChecklistRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
