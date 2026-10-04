"use client";

import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { objectsStrings as s } from "@/lib/i18n/parts/objects";
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

const STATUS_OPTIONS: readonly { value: StatusFilter; label: string }[] = [
  { value: "all", label: s.filters.statusAll },
  { value: "not_started", label: s.filters.statusNotStarted },
  { value: "in_progress", label: s.filters.statusInProgress },
  { value: "paused", label: s.filters.statusPaused },
  { value: "completed", label: s.filters.statusCompleted },
];

interface Option {
  id: string;
  name: string;
}

interface ObjectsFiltersProps {
  value: ObjectsFiltersState;
  onChange: (next: ObjectsFiltersState) => void;
  sites: readonly Option[];
  /** Список працівників — тільки для шефа; без нього блок не показується. */
  workers?: readonly Option[];
}

const selectTriggerClass = "mt-1 h-ctl-md w-full rounded-ctl px-3 text-[14px] font-medium text-text";
const labelClass = "text-[12px] text-ink-2";

/** Блок фільтрів списку «Об'єкти»: статус, період, конкретний об'єкт, працівник. */
export function ObjectsFilters({ value, onChange, sites, workers }: ObjectsFiltersProps) {
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
        <div className="mt-1 grid grid-cols-2 gap-2">
          <label className="block">
            <span className="sr-only">{s.filters.from}</span>
            <Input
              type="date"
              size="sm"
              aria-label={s.filters.from}
              value={value.dateFrom}
              max={value.dateTo || undefined}
              onChange={(event) => patch({ dateFrom: event.target.value })}
            />
          </label>
          <label className="block">
            <span className="sr-only">{s.filters.to}</span>
            <Input
              type="date"
              size="sm"
              aria-label={s.filters.to}
              value={value.dateTo}
              min={value.dateFrom || undefined}
              onChange={(event) => patch({ dateTo: event.target.value })}
            />
          </label>
        </div>
        <p className="mt-1.5 text-[12px] text-ink-2">{s.filters.periodHint}</p>
      </fieldset>

      <div>
        <label className={labelClass}>{s.filters.object}</label>
        <Select value={value.siteId} onValueChange={(siteId) => patch({ siteId })}>
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{s.filters.objectAll}</SelectItem>
            {sites.map((site) => (
              <SelectItem key={site.id} value={site.id}>
                {site.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {workers && (
        <div>
          <label className={labelClass}>{s.filters.worker}</label>
          <Select value={value.workerId} onValueChange={(workerId) => patch({ workerId })}>
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>{s.filters.workerAll}</SelectItem>
              {workers.map((worker) => (
                <SelectItem key={worker.id} value={worker.id}>
                  {worker.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
