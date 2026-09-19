"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { companyStrings as s } from "@/lib/i18n/parts/company";
import { updateCompanyDailyNorm } from "@/modules/company/actions";
import { cn } from "@/lib/utils";

interface CompanyDailyNormFormProps {
  initialMinutes: number;
}

const MIN_HOURS = 1;
const MAX_HOURS = 24;

function minutesToHoursValue(minutes: number): string {
  const hours = minutes / 60;
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

/**
 * Денна норма годин компанії за замовчуванням (`companies.daily_norm_minutes`).
 * Той самий патерн введення й валідації, що й `DailyNormEditor` (норма
 * окремого співробітника на вкладці «Команда»): значення в годинах, крок 0.5,
 * кнопка «Зберегти» з'являється тільки коли поле відрізняється від збереженого.
 */
export function CompanyDailyNormForm({ initialMinutes }: CompanyDailyNormFormProps) {
  const savedValue = minutesToHoursValue(initialMinutes);
  const [hours, setHours] = useState(savedValue);
  const [saved, setSaved] = useState(savedValue);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isDirty = hours.trim() !== saved;

  const handleSave = () => {
    const parsed = Number(hours.replace(",", "."));

    if (!Number.isFinite(parsed) || parsed < MIN_HOURS || parsed > MAX_HOURS) {
      setError(s.settings.dailyNormInvalid);
      return;
    }

    setError(null);

    startTransition(async () => {
      const minutes = Math.round(parsed * 60);
      const result = await updateCompanyDailyNorm(minutes);

      if (result.error) {
        setError(result.error);
        toast(result.error);
        return;
      }

      const normalized = minutesToHoursValue(minutes);
      setHours(normalized);
      setSaved(normalized);
      toast(s.settings.dailyNormSaved);
    });
  };

  return (
    <div className="rounded-[16px] border border-border bg-surface p-4">
      <p className="text-[16px] font-bold text-text">{s.settings.dailyNormTitle}</p>
      <p className="mt-1 text-[13px] font-medium text-text-muted">
        {s.settings.dailyNormDescription}
      </p>

      <div className="mt-3 flex items-center gap-2">
        <label className="text-[13px] font-medium text-text-muted" htmlFor="company-daily-norm">
          {s.settings.dailyNormLabel}
        </label>

        <input
          id="company-daily-norm"
          type="number"
          inputMode="decimal"
          min={MIN_HOURS}
          max={MAX_HOURS}
          step={0.5}
          value={hours}
          onChange={(event) => {
            setHours(event.target.value);
            setError(null);
          }}
          disabled={isPending}
          aria-invalid={error !== null}
          className={cn(
            "h-9 w-16 rounded-[10px] border border-border bg-surface-2 px-2 text-center",
            "text-[14px] font-bold text-text outline-none transition-colors",
            "focus-visible:border-brand",
            "disabled:opacity-60",
            // Текст у полі рендериться на bg-surface-2 (фон самого інпута), де
            // --danger дає лише 3.86:1 — нижче порога 4.5:1. Бордер лишаємо
            // токеном (для 3px+ ліній поріг 3:1, і без нього виникне непослідовність
            // з іншими invalid-полями), а колір тексту — локальний світліший
            // відтінок, без зміни глобального токена.
            error && "border-danger text-[#f4897b]",
          )}
        />
        <span className="text-[13px] font-medium text-text-dim">
          {s.settings.dailyNormUnit}
        </span>

        {isDirty && (
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className={cn(
              "h-9 shrink-0 rounded-[10px] bg-brand px-3 text-[13px] font-bold text-brand-ink",
              "transition-transform duration-150 hover:brightness-110 active:scale-[0.97]",
              "disabled:pointer-events-none disabled:opacity-60",
            )}
          >
            {s.settings.dailyNormSave}
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-[12px] font-semibold text-danger">{error}</p>}
    </div>
  );
}
