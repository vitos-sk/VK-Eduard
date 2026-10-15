"use client";

import { MapPin, Users, X } from "lucide-react";

import { initialsOf } from "@/components/shared/Thumb";
import { Avatar } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectRichItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatHoursShort, pluralize } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";
import type { FilterStat } from "@/modules/entries/filterStats";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const ALL_FILTER = "all";

/** Пункт списку фільтра; `shifts`/`minutes` — скільки змін і годин за поточний місяць. */
export interface FilterOption extends Partial<FilterStat> {
  id: string;
  name: string;
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

interface FilterSelectProps {
  kind: "worker" | "site";
  label: string;
  allLabel: string;
  value: string;
  onChange: (id: string) => void;
  options: readonly FilterOption[];
  total?: FilterStat;
}

/** Компактне поле без підпису (іконка + значення) і випадашка: аватар, назва, «8 змін · 66:40». */
function FilterSelect({ kind, label, allLabel, value, onChange, options, total }: FilterSelectProps) {
  const t = useT();
  const locale = useLocale();
  const s = t.hoursUi;
  const Icon = kind === "worker" ? Users : MapPin;
  const isActive = value !== ALL_FILTER;

  const describe = (stat?: Partial<FilterStat>) =>
    stat?.shifts === undefined || stat.minutes === undefined
      ? undefined
      : `${pluralize(stat.shifts, locale, { one: s.shiftsOne, few: s.shiftsFew, many: s.shiftsMany })} · ${formatHoursShort(stat.minutes)}`;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="compact" active={isActive} aria-label={label}>
        <Icon className={cn("size-4", isActive ? "text-primary" : "text-ink-2")} strokeWidth={1.9} aria-hidden />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="start" collisionPadding={16} className="min-w-64">
        <SelectGroup>
          <SelectLabel>{label}</SelectLabel>
          <SelectRichItem
            value={ALL_FILTER}
            title={allLabel}
            description={describe(total)}
            leading={<Avatar icon={<Icon strokeWidth={1.9} />} />}
          />
          {options.map((option) => (
            <SelectRichItem
              key={option.id}
              value={option.id}
              title={option.name}
              description={describe(option)}
              leading={
                kind === "worker" ? (
                  <Avatar initials={initialsOf(option.name)} />
                ) : (
                  <Avatar icon={<Icon strokeWidth={1.9} />} />
                )
              }
            />
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
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

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="grid grid-cols-2 gap-2">
        <FilterSelect
          kind="worker"
          label={s.filterWorkerLabel}
          allLabel={s.filterWorkerAll}
          value={workerId}
          onChange={onWorkerChange}
          options={workers}
          total={workersTotal}
        />
        <FilterSelect
          kind="site"
          label={s.filterSiteLabel}
          allLabel={s.filterSiteAll}
          value={siteId}
          onChange={onSiteChange}
          options={sites}
          total={sitesTotal}
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
