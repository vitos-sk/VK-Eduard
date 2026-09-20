"use client";

import { Search, SlidersHorizontal } from "lucide-react";

import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Кнопка фильтров справа появляется, только если передан обработчик. */
  onFilterClick?: () => void;
  /** Низкая версия (44px) для плотных панелей. */
  compact?: boolean;
  className?: string;
}

/** Поле поиска + необязательная квадратная кнопка фильтров. */
export function SearchField({
  value,
  onChange,
  placeholder,
  onFilterClick,
  compact = false,
  className,
}: SearchFieldProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-text-dim"
          strokeWidth={2}
          aria-hidden
        />
        <Input
          type="search"
          size={compact ? "sm" : "md"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="pl-11 [&::-webkit-search-cancel-button]:appearance-none"
        />
      </div>

      {onFilterClick && (
        <Button
          variant="outline"
          size="icon"
          className={cn("rounded-ctl bg-field", compact ? "size-ctl-md" : "size-field")}
          onClick={onFilterClick}
          aria-label={t.common.filters}
        >
          <SlidersHorizontal className="size-5" strokeWidth={2} aria-hidden />
        </Button>
      )}
    </div>
  );
}
