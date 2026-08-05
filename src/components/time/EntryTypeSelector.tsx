"use client";

import { Building2, Car, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { t } from "@/lib/i18n";
import type { TimeEntryKind } from "@/lib/types";
import { cn } from "@/lib/utils";

const options: readonly {
  value: TimeEntryKind;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "on_site", label: t.manualTime.onSite, icon: Building2 },
  { value: "outside", label: t.manualTime.outside, icon: Car },
];

interface EntryTypeSelectorProps {
  value: TimeEntryKind;
  onChange: (value: TimeEntryKind) => void;
  className?: string;
}

/** Два больших переключателя типа записи. Активный — в жёлтой рамке с галочкой. */
export function EntryTypeSelector({
  value,
  onChange,
  className,
}: EntryTypeSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label={t.manualTime.entryType}
      className={cn("grid grid-cols-2 gap-3", className)}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex min-h-[92px] flex-col items-start justify-center gap-2 rounded-[16px] border p-4 text-left",
              "transition-transform duration-150 active:scale-[0.98]",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              isActive
                ? "border-brand bg-brand/10 text-text"
                : "border-border bg-surface text-text-muted",
            )}
          >
            <Icon
              className={cn("size-6", isActive ? "text-brand" : "text-text-dim")}
              strokeWidth={2}
              aria-hidden
            />
            <span className="text-[14px] leading-[1.25] font-bold">
              {option.label}
            </span>

            {isActive && (
              <span
                aria-hidden
                className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-brand text-brand-ink"
              >
                <Check className="size-3.5" strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
