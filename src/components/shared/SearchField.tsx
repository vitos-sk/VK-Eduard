"use client";

import { Search, SlidersHorizontal } from "lucide-react";

import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Кнопка фильтров справа появляется, только если передан обработчик. */
  onFilterClick?: () => void;
  className?: string;
}

/** Поле поиска высотой 52px + необязательная квадратная кнопка фильтров. */
export function SearchField({
  value,
  onChange,
  placeholder,
  onFilterClick,
  className,
}: SearchFieldProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex h-[52px] min-w-0 flex-1 items-center gap-2 rounded-[14px] border border-border bg-surface px-4 focus-within:border-brand">
        <Search className="size-5 shrink-0 text-text-dim" strokeWidth={2} aria-hidden />
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-[15px] font-medium text-text",
            "placeholder:text-text-dim focus:outline-none",
            "[&::-webkit-search-cancel-button]:appearance-none",
          )}
        />
      </div>

      {onFilterClick && (
        <button
          type="button"
          onClick={onFilterClick}
          aria-label={t.common.filters}
          className={cn(
            "flex size-[52px] shrink-0 items-center justify-center rounded-[14px] border border-border bg-surface text-text",
            "transition-transform duration-150 active:scale-95",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          )}
        >
          <SlidersHorizontal className="size-5" strokeWidth={2} aria-hidden />
        </button>
      )}
    </div>
  );
}
