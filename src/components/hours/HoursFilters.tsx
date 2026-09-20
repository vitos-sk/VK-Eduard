"use client";

import { X } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { hoursStrings as s } from "@/lib/i18n/parts/hours";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const ALL_FILTER = "all";

const triggerClassName = "mt-1 h-ctl-md w-full rounded-ctl px-3 text-[13px] font-bold text-text";

interface Option {
  id: string;
  name: string;
}

interface HoursFiltersProps {
  workers: readonly Option[];
  sites: readonly Option[];
  workerId: string;
  siteId: string;
  onWorkerChange: (id: string) => void;
  onSiteChange: (id: string) => void;
  className?: string;
}

/** Фільтри записів команди: співробітник + об'єкт (паритет з колишньою адмінкою). */
export function HoursFilters({
  workers,
  sites,
  workerId,
  siteId,
  onWorkerChange,
  onSiteChange,
  className,
}: HoursFiltersProps) {
  const isActive = workerId !== ALL_FILTER || siteId !== ALL_FILTER;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[12px] font-medium text-text-muted">
            {s.filterWorkerLabel}
          </label>
          <Select value={workerId} onValueChange={onWorkerChange}>
            <SelectTrigger className={triggerClassName}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER}>{s.filterWorkerAll}</SelectItem>
              {workers.map((worker) => (
                <SelectItem key={worker.id} value={worker.id}>
                  {worker.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-[12px] font-medium text-text-muted">
            {s.filterSiteLabel}
          </label>
          <Select value={siteId} onValueChange={onSiteChange}>
            <SelectTrigger className={triggerClassName}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER}>{s.filterSiteAll}</SelectItem>
              {sites.map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isActive && (
        <Button
          variant="outline"
          size="sm"
          className="w-fit rounded-full text-text-muted"
          onClick={() => {
            onWorkerChange(ALL_FILTER);
            onSiteChange(ALL_FILTER);
          }}
        >
          <X className="size-3.5" strokeWidth={2.2} aria-hidden />
          {s.resetFilters}
        </Button>
      )}
    </div>
  );
}
