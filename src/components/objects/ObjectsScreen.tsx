"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";

import { AvatarLink } from "@/components/layout/AvatarLink";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { PeriodNavigator } from "@/components/hours/PeriodNavigator";
import { ObjectMenu } from "@/components/objects/ObjectMenu";
import {
  addMonthsSafe,
  useCompanyMonthEntries,
} from "@/components/objects/useCompanyMonthEntries";
import { EmptyState } from "@/components/shared/EmptyState";
import { FiltersDrawer } from "@/components/shared/FiltersDrawer";
import { ObjectCard } from "@/components/shared/ObjectCard";
import { SearchField } from "@/components/shared/SearchField";
import {
  SegmentedTabs,
  type SegmentedOption,
} from "@/components/shared/SegmentedTabs";
import { t } from "@/lib/i18n";
import { objectsStrings as s } from "@/lib/i18n/parts/objects";
import type { WorkEntryWithNames } from "@/modules/entries/types";
import type { SiteObject } from "@/lib/types";
import { cn } from "@/lib/utils";
import { initialsOf, type Profile } from "@/modules/auth/profile";
import { Button } from "@/components/ui/button";

/** «Всі» + три статуса объектов из справочника 3.4. */
type ObjectFilter = "all" | "in_progress" | "not_started" | "completed";

const FILTER_OPTIONS: readonly SegmentedOption<ObjectFilter>[] = [
  { value: "all", label: t.objects.tabs.all },
  { value: "in_progress", label: t.objects.tabs.inProgress },
  { value: "not_started", label: t.objects.tabs.notStarted },
  { value: "completed", label: t.objects.tabs.completed },
];

type ArchiveFilter = "active" | "archived" | "all";

const ARCHIVE_OPTIONS: readonly SegmentedOption<ArchiveFilter>[] = [
  { value: "active", label: s.archiveTabs.active },
  { value: "archived", label: s.archiveTabs.archived },
  { value: "all", label: s.archiveTabs.all },
];

interface SiteStat {
  minutes: number;
  workerCount: number;
}

/** Хвилини й унікальні люди по кожному об'єкту; записи без об'єкта пропускаємо. */
function aggregateBySite(
  entries: readonly Pick<WorkEntryWithNames, "site_id" | "author_id" | "total_minutes">[],
): Map<string, SiteStat> {
  const workers = new Map<string, Set<string>>();
  const result = new Map<string, SiteStat>();

  for (const entry of entries) {
    if (!entry.site_id) continue;
    const set = workers.get(entry.site_id) ?? new Set<string>();
    set.add(entry.author_id);
    workers.set(entry.site_id, set);
    const prev = result.get(entry.site_id) ?? { minutes: 0, workerCount: 0 };
    result.set(entry.site_id, {
      minutes: prev.minutes + (entry.total_minutes ?? 0),
      workerCount: set.size,
    });
  }

  return result;
}

interface ObjectsScreenProps {
  /** Записи компанії за поточний місяць (тільки boss) — для годин на картках. */
  initialEntries?: readonly WorkEntryWithNames[];
  objects: readonly SiteObject[];
  /** Кнопка «+» ведёт на форму создания только у шефа — сама вставка тоже под RLS. */
  isBoss: boolean;
  profile: Profile;
}

/**
 * Экран «Об'єкти»: фильтр по статусу, поиск по названию и адресу,
 * список площадок — уже настоящих, объекты приходят из базы через страницу.
 * Фильтр и поиск считаются на клиенте поверх готового списка: масштаб
 * компании (десятки объектов) этого не замечает.
 */
export function ObjectsScreen({ objects, isBoss, profile, initialEntries }: ObjectsScreenProps) {
  const [filter, setFilter] = useState<ObjectFilter>("all");
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>("active");
  const { month, setMonth, entries, isLoading } = useCompanyMonthEntries(
    profile.company_id,
    isBoss ? (initialEntries ?? []) : null,
  );
  const siteStats = useMemo(() => aggregateBySite(entries), [entries]);
  const monthTitle = `${t.months.nominative[month.getMonth()]} ${month.getFullYear()}`;
  const [query, setQuery] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const visibleObjects = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("uk");

    return objects.filter((object) => {
      if (filter !== "all" && object.status !== filter) {
        return false;
      }

      if (isBoss) {
        if (archiveFilter === "active" && object.archivedAt !== null) return false;
        if (archiveFilter === "archived" && object.archivedAt === null) return false;
      }

      if (!needle) {
        return true;
      }

      return (
        object.name.toLocaleLowerCase("uk").includes(needle) ||
        object.address.toLocaleLowerCase("uk").includes(needle)
      );
    });
  }, [objects, filter, archiveFilter, isBoss, query]);

  return (
    <div className="pb-6">
      <ScreenHeader
        title={t.objects.title}
        action={
          <div className="flex items-center gap-2">
            {isBoss && (
              <Button asChild variant="accent" size="icon" aria-label={t.objects.addObject}>
                <Link href="/objects/new">
                <Plus className="size-6" strokeWidth={2.6} aria-hidden />
                </Link>
              </Button>
            )}
            <AvatarLink initials={initialsOf(profile)} />
          </div>
        }
      />

      <div className="px-4">
        <SegmentedTabs
          options={FILTER_OPTIONS}
          value={filter}
          onChange={setFilter}
          label={t.objects.title}
        />

        {isBoss && (
          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <SegmentedTabs
              options={ARCHIVE_OPTIONS}
              value={archiveFilter}
              onChange={setArchiveFilter}
              label={s.archiveTabsLabel}
              size="sm"
              className="lg:mx-0 lg:px-0"
            />
            <PeriodNavigator
              className="lg:w-[340px] lg:shrink-0"
              title={monthTitle}
              onPrev={() => setMonth((m) => addMonthsSafe(m, -1))}
              onNext={() => setMonth((m) => addMonthsSafe(m, 1))}
            />
          </div>
        )}

        <SearchField
          className="mt-3"
          value={query}
          onChange={setQuery}
          placeholder={t.objects.searchPlaceholder}
          onFilterClick={() => setIsFiltersOpen(true)}
        />

        {visibleObjects.length > 0 ? (
          <div
            className={cn(
              "mt-4 space-y-3 transition-opacity lg:grid lg:grid-cols-3 lg:gap-4 lg:space-y-0",
              isBoss && isLoading && "opacity-60",
            )}
          >
            {visibleObjects.map((object) =>
              isBoss ? (
                <div key={object.id} className="relative">
                  <ObjectCard
                    object={object}
                    showChevron
                    stats={siteStats.get(object.id) ?? { minutes: 0, workerCount: 0 }}
                    className="h-full pr-12 lg:pr-0"
                  />
                  <ObjectMenu
                    siteId={object.id}
                    siteName={object.name}
                    isArchived={object.archivedAt !== null}
                    className="absolute top-2 right-2 lg:bg-surface/90 lg:backdrop-blur-sm"
                  />
                </div>
              ) : (
                <ObjectCard key={object.id} object={object} showChevron />
              ),
            )}
          </div>
        ) : isBoss && objects.length === 0 ? (
          <EmptyState className="mt-6" icon={Building2} title={s.emptyTitle} description={s.emptyHint} />
        ) : (
          <EmptyState
            className="mt-6"
            title={isBoss ? s.emptySearchTitle : t.common.notFound}
            description={isBoss ? s.emptySearchHint : t.common.notFoundHint}
          />
        )}
      </div>

      <FiltersDrawer open={isFiltersOpen} onOpenChange={setIsFiltersOpen} />
    </div>
  );
}
