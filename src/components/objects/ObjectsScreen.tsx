"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";

import { AvatarLink } from "@/components/layout/AvatarLink";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import {
  ANY,
  EMPTY_FILTERS,
  ObjectsFilters,
  type ObjectsFiltersState,
} from "@/components/objects/ObjectsFilters";
import { ObjectMenu } from "@/components/objects/ObjectMenu";
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
import type { SiteObject } from "@/lib/types";
import { cn } from "@/lib/utils";
import { initialsOf, type Profile } from "@/modules/auth/profile";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { getCompanyEntriesInRange } from "@/modules/entries/queries";
import { getCompanyWorkers, type Worker } from "@/modules/team/queries";

/** Границы «без ограничения» для запроса записей, когда задан только работник или одна дата. */
const MIN_DATE = "2000-01-01";
const MAX_DATE = "2100-12-31";

/** «Всі» + три статуса объектов из справочника 3.4. */
type ObjectFilter = "all" | "in_progress" | "not_started" | "completed" | "paused";

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

interface ObjectsScreenProps {
  objects: readonly SiteObject[];
  /** Шеф бачить архів, місячні години і статистику по компанії. */
  isBoss: boolean;
  profile: Profile;
}

/**
 * Экран «Об'єкти»: фильтр по статусу, поиск по названию и адресу,
 * список площадок — уже настоящих, объекты приходят из базы через страницу.
 * Фильтр и поиск считаются на клиенте поверх готового списка: масштаб
 * компании (десятки объектов) этого не замечает.
 */
export function ObjectsScreen({ objects, isBoss, profile }: ObjectsScreenProps) {
  const [filters, setFilters] = useState<ObjectsFiltersState>(EMPTY_FILTERS);
  const [workers, setWorkers] = useState<readonly Worker[]>([]);
  // `null` — записи для фильтра по дате/работнику ещё грузятся (или фильтр не задан).
  const [activeSiteIds, setActiveSiteIds] = useState<ReadonlySet<string> | null>(null);
  const filter: ObjectFilter = filters.status;
  const setFilter = (status: ObjectFilter) => setFilters((prev) => ({ ...prev, status }));
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>("active");
  const [query, setQuery] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const needsEntries =
    filters.dateFrom !== "" || filters.dateTo !== "" || filters.workerId !== ANY;
  const isFiltersActive =
    filters.status !== "all" || filters.siteId !== ANY || needsEntries;

  useEffect(() => {
    if (!isBoss) return;
    let cancelled = false;
    getCompanyWorkers(createClient(), profile.company_id)
      .then((data) => {
        if (!cancelled) setWorkers(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isBoss, profile.company_id]);

  // Дата и работник — свойства записей времени, а не самого объекта: берём
  // объекты, по которым в выбранном периоде есть смены (нужного работника).
  const { dateFrom, dateTo, workerId } = filters;
  useEffect(() => {
    if (!needsEntries) return;
    let cancelled = false;
    getCompanyEntriesInRange(
      createClient(),
      profile.company_id,
      dateFrom || MIN_DATE,
      dateTo || MAX_DATE,
    )
      .then((entries) => {
        if (cancelled) return;
        const ids = new Set<string>();
        for (const entry of entries) {
          if (entry.site_id && (workerId === ANY || entry.author_id === workerId)) {
            ids.add(entry.site_id);
          }
        }
        setActiveSiteIds(ids);
      })
      .catch(() => {
        if (!cancelled) setActiveSiteIds(new Set());
      });
    return () => {
      cancelled = true;
      setActiveSiteIds(null);
    };
  }, [needsEntries, dateFrom, dateTo, workerId, profile.company_id]);

  const isEntriesLoading = needsEntries && activeSiteIds === null;

  const visibleObjects = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("uk");

    return objects.filter((object) => {
      if (filter !== "all" && object.status !== filter) {
        return false;
      }

      if (filters.siteId !== ANY && object.id !== filters.siteId) return false;
      if (needsEntries && (activeSiteIds === null || !activeSiteIds.has(object.id))) {
        return false;
      }

      // Архівні об'єкти працівнику не потрібні — вони лишаються лише в історії.
      if (!isBoss && object.archivedAt !== null) return false;

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
  }, [objects, filter, filters.siteId, needsEntries, activeSiteIds, archiveFilter, isBoss, query]);

  return (
    <div className="pb-6">
      <ScreenHeader
        title={t.objects.title}
        action={
          <div className="flex items-center gap-2">
            <Button asChild variant="accent" size="icon" aria-label={t.objects.addObject}>
              <Link href="/objects/new">
                <Plus className="size-6" strokeWidth={2.6} aria-hidden />
              </Link>
            </Button>
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
          </div>
        )}

        <SearchField
          className="mt-3"
          value={query}
          onChange={setQuery}
          placeholder={t.objects.searchPlaceholder}
          onFilterClick={() => setIsFiltersOpen(true)}
          filterActive={isFiltersActive}
        />

        {isEntriesLoading ? (
          <p className="mt-6 text-center text-[14px] font-medium text-text-muted">
            {t.common.loading}
          </p>
        ) : visibleObjects.length > 0 ? (
          <div
            className={cn(
              "mt-4 space-y-3 lg:grid lg:grid-cols-3 lg:gap-4 lg:space-y-0",
            )}
          >
            {visibleObjects.map((object) =>
              isBoss ? (
                <div key={object.id} className="relative">
                  <ObjectCard
                    object={object}
                    showChevron
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

      <FiltersDrawer
        open={isFiltersOpen}
        onOpenChange={setIsFiltersOpen}
        onReset={() => setFilters(EMPTY_FILTERS)}
      >
        <ObjectsFilters
          value={filters}
          onChange={setFilters}
          sites={objects
            .filter((object) => isBoss || object.archivedAt === null)
            .map((object) => ({ id: object.id, name: object.name }))}
          workers={
            isBoss ? workers.map((worker) => ({ id: worker.id, name: worker.full_name })) : undefined
          }
        />
      </FiltersDrawer>
    </div>
  );
}
