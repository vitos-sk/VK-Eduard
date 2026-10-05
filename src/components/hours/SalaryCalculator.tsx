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
import { useLocale, useT } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";
import { getCompanyWorkers, type Worker } from "@/modules/team/queries";
import type { WorkEntryWithNames } from "@/modules/entries/types";
import { sumTotalMinutes } from "@/modules/time/calc";
import { cn } from "@/lib/utils";
import { ALL_FILTER } from "@/components/hours/HoursFilters";
import { Ticket } from "@/components/ui/ticket";
import { Button } from "@/components/ui/button";
import { UnderlineField } from "@/components/ui/underline-field";

const ALL_WORKERS_ID = ALL_FILTER;

interface SalaryCalculatorProps {
  /** Заголовок обраного місяця — той самий текст, що в навігаторі періоду. */
  monthTitle: string;
  selfId: string;
  /** Шеф бачить перемикач співробітника, рабочий — тільки себе. */
  isBoss: boolean;
  companyId: string;
  /** Обраний співробітник — стан екрана «Години», спільний зі списком змін. */
  workerId: string;
  onWorkerChange: (id: string) => void;
  /**
   * Зміни за обраний місяць, уже відфільтровані екраном (співробітник/об'єкт) —
   * та сама вибірка, що й у списку «Зміни за місяць», тож сума завжди збігається з ним.
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
  workerId,
  onWorkerChange,
  monthEntries,
  className,
}: SalaryCalculatorProps) {
  const t = useT();
  const locale = useLocale();
  const [workers, setWorkers] = useState<readonly Worker[]>([]);
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

  const targetMinutes = useMemo(() => sumTotalMinutes(monthEntries), [monthEntries]);

  const rateNumber = Number(rate.replace(",", "."));
  const hasValidRate = rate.trim() !== "" && Number.isFinite(rateNumber) && rateNumber >= 0;
  const amount = hasValidRate ? (targetMinutes / 60) * rateNumber : 0;

  const handleCopy = () => {
    const text = `${monthTitle}: ${formatHoursShort(targetMinutes)}, ${formatCurrency(amount, locale)}`;

    navigator.clipboard
      .writeText(text)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(() => {});
  };

  return (
    <Ticket asChild variant="flat"><section className={cn(className)}>
      <h2 className="text-[15px] font-semibold">{t.hours.salaryCalcTitle}</h2>

      <div className="mt-2.5 flex flex-col gap-2.5">
        <div className={cn("grid gap-2", isBoss ? "grid-cols-2" : "grid-cols-1")}>
          {isBoss && (
            <div>
              <label className="text-[12px] text-ink-2">
                {t.hours.salaryCalcWorkerLabel}
              </label>
              <Select value={workerId} onValueChange={onWorkerChange}>
                <SelectTrigger
                  className="mt-1 h-ctl-sm w-full rounded-md px-2.5 text-[13px] font-medium text-text"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_WORKERS_ID}>{t.hours.salaryCalcAll}</SelectItem>
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
            <UnderlineField
              label={t.hours.salaryCalcRateLabel}
              id="salary-rate"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder={t.hours.salaryCalcRatePlaceholder}
              value={rate}
              onChange={(event) => setRate(event.target.value)}
              className="tabular [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
        </div>

        <div className="perf-t flex items-center justify-between gap-2 pt-2.5">
          <span className="min-w-0 text-[13px] text-ink-2">
            {t.hours.salaryCalcAmount}
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <span className="tabular text-[18px] font-semibold whitespace-nowrap">
              {formatCurrency(amount, locale)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={!hasValidRate}
            >
              {isCopied ? (
                <Check className="size-4" strokeWidth={1.9} aria-hidden />
              ) : (
                <Copy className="size-4" strokeWidth={1.9} aria-hidden />
              )}
              {isCopied ? t.hours.salaryCalcCopied : t.hours.salaryCalcCopy}
            </Button>
          </div>
        </div>
      </div>
    </section></Ticket>
  );
}
