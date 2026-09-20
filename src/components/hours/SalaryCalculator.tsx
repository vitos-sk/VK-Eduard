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
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ALL_WORKERS_ID = "all";

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
        selectedWorkerId === ALL_WORKERS_ID
          ? monthEntries
          : monthEntries.filter((entry) => entry.author_id === selectedWorkerId),
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
    <Card asChild padding="none"><section className={cn("p-3.5", className)}>
      <h2 className="text-[15px] font-bold">{t.hours.salaryCalcTitle}</h2>

      <div className="mt-2.5 flex flex-col gap-2.5">
        <div className={cn("grid gap-2", isBoss ? "grid-cols-2" : "grid-cols-1")}>
          {isBoss && (
            <div>
              <label className="text-[12px] font-medium text-text-muted">
                {t.hours.salaryCalcWorkerLabel}
              </label>
              <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                <SelectTrigger
                  className="mt-1 h-ctl-sm w-full rounded-md px-2.5 text-[13px] font-bold text-text"
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
            <label htmlFor="salary-rate" className="text-[12px] font-medium text-text-muted">
              {t.hours.salaryCalcRateLabel}
            </label>
            <Input
              id="salary-rate"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder={t.hours.salaryCalcRatePlaceholder}
              value={rate}
              onChange={(event) => setRate(event.target.value)}
              className="mt-1 h-ctl-sm px-2.5 text-[13px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
        </div>

        <div className="flex items-baseline justify-between border-t border-border pt-2.5">
          <span className="text-[13px] font-medium text-text-muted">
            {t.hours.salaryCalcAmount}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="tabular text-[18px] font-extrabold">
              {formatCurrency(amount)}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              className="rounded-md"
              onClick={handleCopy}
              disabled={!hasValidRate}
              aria-label={isCopied ? t.hours.salaryCalcCopied : t.hours.salaryCalcCopy}
            >
              {isCopied ? (
                <Check className="size-4" strokeWidth={2} aria-hidden />
              ) : (
                <Copy className="size-4" strokeWidth={2} aria-hidden />
              )}
            </Button>
          </div>
        </div>
      </div>
    </section></Card>
  );
}
