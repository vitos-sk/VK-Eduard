"use client";

import { t } from "@/lib/i18n";
import type { WorkCategory } from "@/modules/reports/types";
import { cn } from "@/lib/utils";
import { Chip } from "@/components/ui/chip";

interface WorkCategoryChipsProps {
  categories: readonly WorkCategory[];
  value: readonly string[];
  onChange: (ids: string[]) => void;
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
          <Chip
            key={category.id}
            selected={selected}
            disabled={readOnly}
            className={cn(readOnly && "disabled:opacity-100")}
            onClick={() => {
              onChange(selected ? value.filter((id) => id !== category.id) : [...value, category.id]);
            }}
          >
            {category.label}
          </Chip>
        );
      })}
    </div>
  );
}
