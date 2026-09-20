"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { companyStrings as s } from "@/lib/i18n/parts/company";
import { updateCompanyDailyNorm } from "@/modules/company/actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <Card>
      <p className="text-[16px] font-bold text-text">{s.settings.dailyNormTitle}</p>
      <p className="mt-1 text-[13px] font-medium text-text-muted">
        {s.settings.dailyNormDescription}
      </p>

      <div className="mt-3 flex items-center gap-2">
        <label className="text-[13px] font-medium text-text-muted" htmlFor="company-daily-norm">
          {s.settings.dailyNormLabel}
        </label>

        <Input
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
          className="h-ctl-sm w-20 px-2 text-center text-[14px]"
        />
        <span className="text-[13px] font-medium text-text-dim">
          {s.settings.dailyNormUnit}
        </span>

        {isDirty && (
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            {s.settings.dailyNormSave}
          </Button>
        )}
      </div>

      {error && <p className="mt-2 text-[12px] font-semibold text-danger-fg">{error}</p>}
    </Card>
  );
}
