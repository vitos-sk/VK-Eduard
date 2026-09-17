"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { t } from "@/lib/i18n";
import { updateWorkerDailyNorm } from "@/modules/team/actions";
import { cn } from "@/lib/utils";

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
  const savedValue = minutesToHoursValue(initialMinutes);
  const [hours, setHours] = useState(savedValue);
  const [saved, setSaved] = useState(savedValue);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isDirty = hours.trim() !== saved;

  const handleSave = () => {
    const parsed = Number(hours.replace(",", "."));

    if (!Number.isFinite(parsed) || parsed < MIN_HOURS || parsed > MAX_HOURS) {
      setError(t.admin.team.dailyNormInvalid);
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
      toast(t.admin.team.dailyNormSaved);
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <label
          className="text-[13px] font-medium text-text-muted"
          htmlFor={`daily-norm-${workerId}`}
        >
          {t.admin.team.dailyNorm}
        </label>

        <input
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
          className={cn(
            "h-9 w-16 rounded-[10px] border border-border bg-surface px-2 text-center",
            "text-[14px] font-bold outline-none focus-visible:border-brand",
            "disabled:opacity-60",
            error && "border-danger text-danger",
          )}
        />
        <span className="text-[13px] font-medium text-text-dim">{t.admin.team.dailyNormUnit}</span>

        {isDirty && (
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className={cn(
              "h-9 shrink-0 rounded-[10px] bg-brand px-3 text-[13px] font-bold text-brand-ink",
              "transition-transform duration-150 active:scale-[0.97]",
              "disabled:pointer-events-none disabled:opacity-60",
            )}
          >
            {t.admin.team.dailyNormSave}
          </button>
        )}
      </div>

      {/* Рядок рендериться на bg-surface-2 (картка воркера в AdminTeamScreen),
          де токен --danger дає лише 3.86:1 — нижче порога 4.5:1 для звичайного
          тексту. Локальний світліший відтінок замість зміни глобального
          токена (він використовується по всьому застосунку). */}
      {error && <p className="text-[12px] font-semibold text-[#f4897b]">{error}</p>}
    </div>
  );
}
