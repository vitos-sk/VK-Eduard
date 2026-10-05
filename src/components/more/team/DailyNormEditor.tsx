"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { useT } from "@/lib/i18n/client";
import { updateWorkerDailyNorm } from "@/modules/team/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DailyNormEditorProps {
  workerId: string;
  initialMinutes: number;
}

const MIN_HOURS = 1;
const MAX_HOURS = 24;

function minutesToHoursValue(minutes: number): string {
  const hours = minutes / 60;
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

/**
 * Інлайн-редактор денної норми годин співробітника (`profiles.daily_norm_minutes`).
 * Значення в годинах (крок 0.5), кнопка «Зберегти» з'являється тільки коли
 * поле відрізняється від збереженого — так само, як інші форми в проєкті
 * не шлють запит, поки нема реальної зміни.
 */
export function DailyNormEditor({ workerId, initialMinutes }: DailyNormEditorProps) {
  const t = useT();
  const s = t.companyUi;
  const savedValue = minutesToHoursValue(initialMinutes);
  const [hours, setHours] = useState(savedValue);
  const [saved, setSaved] = useState(savedValue);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isDirty = hours.trim() !== saved;

  const handleSave = () => {
    const parsed = Number(hours.replace(",", "."));

    if (!Number.isFinite(parsed) || parsed < MIN_HOURS || parsed > MAX_HOURS) {
      setError(s.team.dailyNormInvalid);
      return;
    }

    setError(null);

    startTransition(async () => {
      const minutes = Math.round(parsed * 60);
      const result = await updateWorkerDailyNorm(workerId, minutes);

      if (result.error) {
        setError(result.error);
        toast(result.error);
        return;
      }

      const normalized = minutesToHoursValue(minutes);
      setHours(normalized);
      setSaved(normalized);
      toast(s.team.dailyNormSaved);
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <label
          className="text-[13px] text-ink-2"
          htmlFor={`daily-norm-${workerId}`}
        >
          {s.team.dailyNorm}
        </label>

        <Input
          id={`daily-norm-${workerId}`}
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
          className="tabular h-ctl-sm w-20 px-2 text-center text-[14px]"
        />
        <span className="text-[13px] text-ink-2">{s.team.dailyNormUnit}</span>

        {isDirty && (
          <Button size="sm" onClick={handleSave} loading={isPending}>
            {s.team.dailyNormSave}
          </Button>
        )}
      </div>

      {error && <p className="text-[12px] text-err">{error}</p>}
    </div>
  );
}
