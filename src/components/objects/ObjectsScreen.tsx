"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { FiltersDrawer } from "@/components/shared/FiltersDrawer";
import { ObjectCard } from "@/components/shared/ObjectCard";
import { SearchField } from "@/components/shared/SearchField";
import {
  SegmentedTabs,
  type SegmentedOption,
} from "@/components/shared/SegmentedTabs";
import { t } from "@/lib/i18n";
import type { SiteObject } from "@/lib/types";
import { cn } from "@/lib/utils";

/** «Всі» + три статуса объектов из справочника 3.4. */
type ObjectFilter = "all" | "in_progress" | "not_started" | "completed";

const FILTER_OPTIONS: readonly SegmentedOption<ObjectFilter>[] = [
  { value: "all", label: t.objects.tabs.all },
  { value: "in_progress", label: t.objects.tabs.inProgress },
  { value: "not_started", label: t.objects.tabs.notStarted },
  { value: "completed", label: t.objects.tabs.completed },
];

interface ObjectsScreenProps {
  objects: readonly SiteObject[];
  /** Кнопка «+» ведёт на форму создания только у шефа — сама вставка тоже под RLS. */
  isBoss: boolean;
}

/**
 * Экран «Об'єкти»: фильтр по статусу, поиск по названию и адресу,
 * список площадок — уже настоящих, объекты приходят из базы через страницу.
 * Фильтр и поиск считаются на клиенте поверх готового списка: масштаб
 * компании (десятки объектов) этого не замечает.
 */
export function ObjectsScreen({ objects, isBoss }: ObjectsScreenProps) {
  const [filter, setFilter] = useState<ObjectFilter>("all");
  const [query, setQuery] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const visibleObjects = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("uk");

    return objects.filter((object) => {
      if (filter !== "all" && object.status !== filter) {
        return false;
      }

      if (!needle) {
        return true;
      }

      return (
        object.name.toLocaleLowerCase("uk").includes(needle) ||
        object.address.toLocaleLowerCase("uk").includes(needle)
      );
    });
  }, [objects, filter, query]);

  return (
    <div className="pb-6">
      <ScreenHeader
        title={t.objects.title}
        action={
          isBoss && (
            <Link
              href="/objects/new"
              aria-label={t.objects.addObject}
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-full bg-brand text-brand-ink",
                "transition-transform duration-150 active:scale-95",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              )}
            >
              <Plus className="size-6" strokeWidth={2.6} aria-hidden />
            </Link>
          )
        }
      />

      <div className="px-4">
        <SegmentedTabs
          options={FILTER_OPTIONS}
          value={filter}
          onChange={setFilter}
          label={t.objects.title}
        />

        <SearchField
          className="mt-3"
          value={query}
          onChange={setQuery}
          placeholder={t.objects.searchPlaceholder}
          onFilterClick={() => setIsFiltersOpen(true)}
        />

        {visibleObjects.length > 0 ? (
          <div className="mt-4 space-y-3">
            {visibleObjects.map((object) => (
              <ObjectCard key={object.id} object={object} showChevron />
            ))}
          </div>
        ) : (
          <EmptyState
            className="mt-6"
            title={t.common.notFound}
            description={t.common.notFoundHint}
          />
        )}
      </div>

      <FiltersDrawer open={isFiltersOpen} onOpenChange={setIsFiltersOpen} />
    </div>
  );
}
