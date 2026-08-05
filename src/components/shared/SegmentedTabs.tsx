"use client";

import { cn } from "@/lib/utils";

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
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-11 shrink-0 rounded-full px-4 text-[14px] font-semibold whitespace-nowrap",
              "transition-colors duration-150",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              isActive
                ? "bg-brand text-brand-ink"
                : "bg-surface-2 text-text-muted",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
