"use client";

import { t } from "@/lib/i18n";
import type { WorkCategory } from "@/modules/reports/types";
import { cn } from "@/lib/utils";

interface WorkCategoryChipsProps {
  categories: readonly WorkCategory[];
  value: readonly string[];
  onChange?: (ids: string[]) => void;
  /** Тільки перегляд — на детальній сторінці поза режимом правки. */
  readOnly?: boolean;
  className?: string;
}

/**
 * Ряд чипів «Вид робіт» — мульти-select тапом. Категорія без назви (архівована,
 * якщо колись з'явиться екран архівації) сюди не потрапляє — список приходить
 * уже відфільтрованим `getWorkCategories`.
 */
export function WorkCategoryChips({
  categories,
  value,
  onChange,
  readOnly,
  className,
}: WorkCategoryChipsProps) {
  if (readOnly && value.length === 0) {
    return <p className={cn("text-[14px] font-medium text-text-muted", className)}>{t.reportDetail.noCategoriesLabel}</p>;
  }

  const visible = readOnly ? categories.filter((category) => value.includes(category.id)) : categories;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {visible.map((category) => {
        const selected = value.includes(category.id);

        return (
          <button
            key={category.id}
            type="button"
            disabled={readOnly}
            onClick={() => {
              if (!onChange) return;
              onChange(selected ? value.filter((id) => id !== category.id) : [...value, category.id]);
            }}
            aria-pressed={selected}
            className={cn(
              "flex h-9 items-center rounded-full border px-3 text-[13px] font-bold",
              !readOnly && "transition-transform duration-150 active:scale-95",
              selected
                ? "border-brand bg-brand text-brand-ink"
                : "border-border bg-surface-2 text-text",
              readOnly && "pointer-events-none",
            )}
          >
            {category.label}
          </button>
        );
      })}
    </div>
  );
}
