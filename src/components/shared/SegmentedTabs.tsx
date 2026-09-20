"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedTabsProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Подпись группы для скринридера, например «Об'єкти». */
  label?: string;
  className?: string;
  /** "sm" — компактные пилюли для тесных шапок. */
  size?: "md" | "sm";
}

/**
 * Ряд пилюль-фильтров. Активная — жёлтая с тёмным текстом.
 * Если не влезают по ширине — горизонтальный скролл без видимого скроллбара.
 */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
  size = "md",
}: SegmentedTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4",
        className,
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <Button
            key={option.value}
            role="tab"
            aria-selected={isActive}
            variant={isActive ? "primary" : "secondary"}
            size={size === "sm" ? "sm" : "md"}
            className={cn("rounded-full", !isActive && "text-text-muted")}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
