"use client";

import { MapPin, Users } from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { FilterSelect } from "@/components/shared/FilterSelect";
import { DateRangeField } from "@/components/shared/DateRangeField";
import { useT } from "@/lib/i18n/client";
import type { WorkStatus } from "@/lib/types";

export const ANY = "all";

export type StatusFilter = "all" | WorkStatus;

export interface ObjectsFiltersState {
  status: StatusFilter;
  dateFrom: string;
  dateTo: string;
  siteId: string;
  workerId: string;
}

export const EMPTY_FILTERS: ObjectsFiltersState = {
  status: "all",
  dateFrom: "",
  dateTo: "",
  siteId: ANY,
  workerId: ANY,
};

interface Option {
  id: string;
  name: string;
  /** Подпись под названием в списке (адрес объекта). */
  description?: string;
}

interface ObjectsFiltersProps {
  value: ObjectsFiltersState;
  onChange: (next: ObjectsFiltersState) => void;
  sites: readonly Option[];
  /** Список працівників — тільки для шефа; без нього блок не показується. */
  workers?: readonly Option[];
}

const labelClass = "text-[12px] text-ink-2";

/** Блок фільтрів списку «Об'єкти»: статус, період, конкретний об'єкт, працівник. */
export function ObjectsFilters({ value, onChange, sites, workers }: ObjectsFiltersProps) {
  const t = useT();
  const s = t.objectsUi;
  const STATUS_OPTIONS: readonly { value: StatusFilter; label: string }[] = [
    { value: "all", label: s.filters.statusAll },
    { value: "not_started", label: s.filters.statusNotStarted },
    { value: "in_progress", label: s.filters.statusInProgress },
    { value: "paused", label: s.filters.statusPaused },
    // «Завершено» нет: завершённые объекты уходят в архив сами — смотрите вкладку «Архів».
  ];
  const patch = (partial: Partial<ObjectsFiltersState>) => onChange({ ...value, ...partial });

  return (
    <div className="flex flex-col gap-4 pb-1">
      <fieldset>
        <legend className={labelClass}>{s.filters.status}</legend>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              selected={value.status === option.value}
              onClick={() => patch({ status: option.value })}
            >
              {option.label}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={labelClass}>{s.filters.period}</legend>
        <DateRangeField
          className="mt-1"
          from={value.dateFrom}
          to={value.dateTo}
          onChange={({ from, to }) => patch({ dateFrom: from, dateTo: to })}
          fromLabel={s.filters.from}
          toLabel={s.filters.to}
        />
        <p className="mt-1.5 text-[12px] text-ink-2">{s.filters.periodHint}</p>
      </fieldset>

      <div>
        <label className={labelClass}>{s.filters.object}</label>
        <FilterSelect
          className="mt-1"
          icon={MapPin}
          avatar="icon"
          label={s.filters.object}
          allLabel={s.filters.objectAll}
          value={value.siteId}
          onChange={(siteId) => patch({ siteId })}
          options={sites}
        />
      </div>

      {workers && (
        <div>
          <label className={labelClass}>{s.filters.worker}</label>
          <FilterSelect
            className="mt-1"
            icon={Users}
            avatar="initials"
            label={s.filters.worker}
            allLabel={s.filters.workerAll}
            value={value.workerId}
            onChange={(workerId) => patch({ workerId })}
            options={workers}
          />
        </div>
      )}
    </div>
  );
}
