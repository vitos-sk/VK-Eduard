"use client";

import { cn } from "@/lib/utils";
import { Chip } from "@/components/ui/chip";

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
  /**
   * `segment` — единый блок с пунктирными разделителями (День · Тиждень · Місяць);
   * `chips` — ряд чипов, скроллится по горизонтали (фильтры списков).
   */
  variant?: "segment" | "chips";
}

/**
 * Переключатель вкладок. Активный сегмент — зелёный, остальные на `ticket`.
 * Чипы, если не влезают по ширине, скроллятся без видимого скроллбара.
 */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
  variant = "segment",
}: SegmentedTabsProps<T>) {
  if (variant === "chips") {
    return (
      <div
        role="tablist"
        aria-label={label}
        className={cn("no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 py-2", className)}
      >
        {options.map((option) => (
          <Chip
            key={option.value}
            role="tab"
            aria-selected={option.value === value}
            selected={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Chip>
        ))}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "flex overflow-hidden rounded-ctl border border-edge bg-ticket",
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
              "relative h-[34px] min-w-0 flex-1 px-3 text-[13px] font-medium transition-colors outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
              "not-first:border-l not-first:border-dashed not-first:border-perf",
              isActive ? "bg-primary text-on-primary" : "text-ink-2 hover:bg-primary-tint",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
