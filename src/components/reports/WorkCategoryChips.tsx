"use client";

import { t } from "@/lib/i18n";
import { categoryLabel, OTHER_TEXT_MAX_LENGTH } from "@/modules/reports/categoryLabels";
import type { WorkCategory } from "@/modules/reports/types";
import { cn } from "@/lib/utils";
import { Chip } from "@/components/ui/chip";
import { UnderlineField } from "@/components/ui/underline-field";

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
 * Ряд чипів «Вид робіт» — мульти-select тапом. «Інше» відкриває поле
 * (UnderlineField), куди працівник вписує, що саме робив; порожнє — помилка.
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
    return <p className={cn("text-[14px] text-ink-2", className)}>{t.reportDetail.noCategoriesLabel}</p>;
  }

  const visible = readOnly ? categories.filter((category) => value.includes(category.id)) : categories;
  const otherMissing = isOtherSelected(categories, value) && otherText.trim() === "";

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((category) => {
          const selected = value.includes(category.id);

          return (
            <Chip
              key={category.id}
              selected={selected}
              disabled={readOnly}
              className={cn(readOnly && "disabled:text-on-primary")}
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
        <UnderlineField
          className="mt-3"
          label={t.reportForm.otherLabel}
          value={otherText}
          maxLength={OTHER_TEXT_MAX_LENGTH}
          placeholder={t.reportForm.otherPlaceholder}
          error={otherMissing ? t.reportForm.otherRequired : undefined}
          onChange={(event) => onOtherTextChange?.(event.target.value)}
        />
      )}
    </div>
  );
}
