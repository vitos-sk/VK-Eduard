"use client";

import { t } from "@/lib/i18n";
import { categoryLabel, OTHER_TEXT_MAX_LENGTH } from "@/modules/reports/categoryLabels";
import type { WorkCategory } from "@/modules/reports/types";
import { cn } from "@/lib/utils";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";

interface WorkCategoryChipsProps {
  categories: readonly WorkCategory[];
  value: readonly string[];
  onChange: (ids: string[]) => void;
  /** Текст категорії «Інше» — поле з'являється, коли вона вибрана. */
  otherText: string;
  onOtherTextChange?: (text: string) => void;
  /** Тільки перегляд — на детальній сторінці поза режимом правки. */
  readOnly?: boolean;
  className?: string;
}

/** Чи вибрана серед `value` категорія «Інше» — тоді потрібен текст. */
export function isOtherSelected(
  categories: readonly WorkCategory[],
  value: readonly string[],
): boolean {
  return categories.some((category) => category.is_other && value.includes(category.id));
}

/**
 * Ряд чипів «Вид робіт» — мульти-select тапом. Категорія без назви (архівована,
 * якщо колись з'явиться екран архівації) сюди не потрапляє — список приходить
 * уже відфільтрованим `getWorkCategories`. «Інше» відкриває поле, куди
 * працівник вписує, що саме робив.
 */
export function WorkCategoryChips({
  categories,
  value,
  onChange,
  otherText,
  onOtherTextChange,
  readOnly,
  className,
}: WorkCategoryChipsProps) {
  if (readOnly && value.length === 0) {
    return <p className={cn("text-[14px] font-medium text-text-muted", className)}>{t.reportDetail.noCategoriesLabel}</p>;
  }

  const visible = readOnly ? categories.filter((category) => value.includes(category.id)) : categories;

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
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
              {readOnly ? categoryLabel(category, otherText) : category.label}
            </Chip>
          );
        })}
      </div>

      {!readOnly && isOtherSelected(categories, value) && (
        <div className="mt-3">
          <label className="mb-1.5 block text-[13px] font-semibold text-text-muted">
            {t.reportForm.otherLabel}
          </label>
          <Input
            value={otherText}
            maxLength={OTHER_TEXT_MAX_LENGTH}
            placeholder={t.reportForm.otherPlaceholder}
            onChange={(event) => onOtherTextChange?.(event.target.value)}
          />
        </div>
      )}
    </div>
  );
}
