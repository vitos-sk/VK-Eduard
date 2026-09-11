"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatHoursShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { getCompanyWorkers, type Worker } from "@/modules/team/queries";
import type { WorkEntryWithNames } from "@/modules/entries/types";
import { sumTotalMinutes } from "@/modules/time/calc";
import { cn } from "@/lib/utils";

interface SalaryCalculatorProps {
  /** Заголовок обраного місяця — той самий текст, що в навігаторі періоду. */
  monthTitle: string;
  selfId: string;
  /** Шеф бачить перемикач співробітника, рабочий — тільки себе. */
  isBoss: boolean;
  companyId: string;
  /**
   * Зміни за обраний місяць. Для рабочего RLS вже віддає тільки його власні
   * записи, для шефа — всю компанію, тому фільтрація по `author_id`
   * коректна для обох ролей без окремого запиту.
   */
  monthEntries: readonly WorkEntryWithNames[];
  className?: string;
}

/**
 * Блок «Калькулятор зарплати» на вкладці «Місяць» екрана «Години». Ставка
 * ніде не зберігається — тільки в стані компонента на час сесії.
 */
export function SalaryCalculator({
  monthTitle,
  selfId,
  isBoss,
  companyId,
  monthEntries,
  className,
}: SalaryCalculatorProps) {
  const [workers, setWorkers] = useState<readonly Worker[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState(selfId);
  const [rate, setRate] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!isBoss) return;

    let cancelled = false;
    const supabase = createClient();

    getCompanyWorkers(supabase, companyId)
      .then((data) => {
        if (!cancelled) setWorkers(data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isBoss, companyId]);

  const targetMinutes = useMemo(
    () =>
      sumTotalMinutes(
        monthEntries.filter((entry) => entry.author_id === selectedWorkerId),
      ),
    [monthEntries, selectedWorkerId],
  );

  const rateNumber = Number(rate.replace(",", "."));
  const hasValidRate = rate.trim() !== "" && Number.isFinite(rateNumber) && rateNumber >= 0;
  const amount = hasValidRate ? (targetMinutes / 60) * rateNumber : 0;

  const handleCopy = () => {
    const text = `${monthTitle}: ${formatHoursShort(targetMinutes)}, ${formatCurrency(amount)}`;

    navigator.clipboard
      .writeText(text)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(() => {});
  };

  return (
    <section
      className={cn(
        "rounded-[16px] border border-border bg-surface p-4",
        className,
      )}
    >
      <h2 className="text-[17px] font-bold">{t.hours.salaryCalcTitle}</h2>

      <div className="mt-3 flex flex-col gap-3">
        {isBoss && (
          <div>
            <label className="text-[13px] font-medium text-text-muted">
              {t.hours.salaryCalcWorkerLabel}
            </label>
            <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
              <SelectTrigger className="mt-1.5 h-11 w-full rounded-[12px] px-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={selfId}>{t.hours.salaryCalcSelf}</SelectItem>
                {workers
                  .filter((worker) => worker.id !== selfId)
                  .map((worker) => (
                    <SelectItem key={worker.id} value={worker.id}>
                      {worker.full_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <label htmlFor="salary-rate" className="text-[13px] font-medium text-text-muted">
            {t.hours.salaryCalcRateLabel}
          </label>
          <input
            id="salary-rate"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder={t.hours.salaryCalcRatePlaceholder}
            value={rate}
            onChange={(event) => setRate(event.target.value)}
            className={cn(
              "mt-1.5 h-11 w-full rounded-[12px] border border-border bg-surface-2 px-3",
              "text-[15px] font-bold text-text placeholder:text-text-dim placeholder:font-medium",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
            )}
          />
        </div>

        <div className="flex items-baseline justify-between border-t border-border pt-3">
          <span className="text-[13px] font-medium text-text-muted">
            {t.hours.salaryCalcAmount}
          </span>
          <span className="tabular text-[20px] font-extrabold">
            {formatCurrency(amount)}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          disabled={!hasValidRate}
          className={cn(
            "flex h-12 items-center justify-center gap-2 rounded-[14px]",
            "border border-border text-[15px] font-bold text-text",
            "transition-transform duration-150 active:scale-[0.98]",
            "disabled:opacity-40",
          )}
        >
          {isCopied ? (
            <Check className="size-[18px]" strokeWidth={2} aria-hidden />
          ) : (
            <Copy className="size-[18px]" strokeWidth={2} aria-hidden />
          )}
          {isCopied ? t.hours.salaryCalcCopied : t.hours.salaryCalcCopy}
        </button>
      </div>
    </section>
  );
}
