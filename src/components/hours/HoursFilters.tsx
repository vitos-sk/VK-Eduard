"use client";

import { MapPin, Users, X } from "lucide-react";

import { ALL_FILTER, FilterSelect } from "@/components/shared/FilterSelect";
import { formatHoursShort, pluralize } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";
import type { FilterStat } from "@/modules/entries/filterStats";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export { ALL_FILTER };

/** Пункт списку фільтра; `shifts`/`minutes` — скільки змін і годин за поточний місяць. */
export interface FilterOption extends Partial<FilterStat> {
  id: string;
  name: string;
  /** Ссылка на фото: аватар сотрудника или обложка объекта. */
  photoUrl?: string | null;
}

interface HoursFiltersProps {
  workers: readonly FilterOption[];
  sites: readonly FilterOption[];
  /** Підсумок для пункту «Усі співробітники» / «Усі об'єкти». */
  workersTotal?: FilterStat;
  sitesTotal?: FilterStat;
  workerId: string;
  siteId: string;
  onWorkerChange: (id: string) => void;
  onSiteChange: (id: string) => void;
  className?: string;
}

/** Підпис під назвою в списку: скільки змін і годин за поточний місяць. */
function useDescribe() {
  const t = useT();
  const locale = useLocale();
  const s = t.hoursUi;

  return (stat?: Partial<FilterStat>) =>
    stat?.shifts === undefined || stat.minutes === undefined
      ? undefined
      : `${pluralize(stat.shifts, locale, { one: s.shiftsOne, few: s.shiftsFew, many: s.shiftsMany })} · ${formatHoursShort(stat.minutes)}`;
}

/** Фільтри записів команди: співробітник + об'єкт (паритет з колишньою адмінкою). */
export function HoursFilters({
  workers,
  sites,
  workersTotal,
  sitesTotal,
  workerId,
  siteId,
  onWorkerChange,
  onSiteChange,
  className,
}: HoursFiltersProps) {
  const t = useT();
  const s = t.hoursUi;
  const isActive = workerId !== ALL_FILTER || siteId !== ALL_FILTER;
  const describe = useDescribe();
  const toOptions = (list: readonly FilterOption[]) =>
    list.map((option) => ({
      id: option.id,
      name: option.name,
      description: describe(option),
      photoUrl: option.photoUrl,
    }));

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="grid grid-cols-2 gap-2">
        <FilterSelect
          icon={Users}
          avatar="initials"
          label={s.filterWorkerLabel}
          allLabel={s.filterWorkerAll}
          allDescription={describe(workersTotal)}
          value={workerId}
          onChange={onWorkerChange}
          options={toOptions(workers)}
        />
        <FilterSelect
          icon={MapPin}
          avatar="icon"
          label={s.filterSiteLabel}
          allLabel={s.filterSiteAll}
          allDescription={describe(sitesTotal)}
          value={siteId}
          onChange={onSiteChange}
          options={toOptions(sites)}
        />
      </div>

      {isActive && (
        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => {
            onWorkerChange(ALL_FILTER);
            onSiteChange(ALL_FILTER);
          }}
        >
          <X className="size-3.5" strokeWidth={1.9} aria-hidden />
          {s.resetFilters}
        </Button>
      )}
    </div>
  );
}
