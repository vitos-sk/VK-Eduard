"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";

import { WorkerMultiSelect } from "@/components/shared/WorkerMultiSelect";
import { Button } from "@/components/ui/button";
import { Ticket } from "@/components/ui/ticket";
import { UnderlineField } from "@/components/ui/underline-field";
import { fmt, formatCurrency } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";
import type { WorkEntryWithNames } from "@/modules/entries/types";
import { buildPayrollText, payrollAmount, type PayrollPerson } from "@/modules/payroll/format";
import { cn } from "@/lib/utils";

interface SalaryCalculatorProps {
  /** Любой день выбранного месяца — из него берутся период в заголовке расчёта. */
  month: Date;
  selfId: string;
  selfName: string;
  /** Шеф выбирает сотрудников, рабочий считает только себя. */
  isBoss: boolean;
  /** Сотрудники компании — для выбора (только шеф). */
  workers: readonly PayrollPerson[];
  /** Смены за месяц: рабочему — свои, шефу — вся компания (RLS). */
  monthEntries: readonly WorkEntryWithNames[];
  className?: string;
}

/**
 * Блок «Калькулятор зарплати» экрана «Години»: выбор сотрудников (несколько), ставка и
 * кнопка «Скопіювати» — копируется готовый текст расчёта (на языке интерфейса). Ставка нигде не хранится — только на время сессии.
 */
export function SalaryCalculator({
  month,
  selfId,
  selfName,
  isBoss,
  workers,
  monthEntries,
  className,
}: SalaryCalculatorProps) {
  const t = useT();
  const locale = useLocale();
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [rate, setRate] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  // В списке — все сотрудники; сам шеф тоже, даже если его нет среди «работников».
  const everyone = useMemo<PayrollPerson[]>(() => {
    if (!isBoss) return [{ id: selfId, name: selfName }];

    const others = workers.filter((worker) => worker.id !== selfId);

    return [{ id: selfId, name: `${selfName} (${t.hours.salaryCalcSelf})` }, ...others];
  }, [isBoss, selfId, selfName, workers, t.hours.salaryCalcSelf]);

  // Пустой выбор — все; иначе только отмеченные, в порядке списка.
  const people = useMemo(
    () => (selectedIds.length === 0 ? everyone : everyone.filter((person) => selectedIds.includes(person.id))),
    [everyone, selectedIds],
  );

  const rateNumber = Number(rate.replace(",", "."));
  const hasValidRate = rate.trim() !== "" && Number.isFinite(rateNumber) && rateNumber >= 0;
  const rateOrNull = hasValidRate ? rateNumber : null;

  const amount = payrollAmount(monthEntries, people, rateOrNull) ?? 0;

  const text = useMemo(
    () =>
      buildPayrollText({
        entries: monthEntries,
        monthDate: month,
        people,
        rate: rateOrNull,
        // Имя в расчёте нужно, когда он не только про самого пользователя.
        showNames: isBoss,
        t,
        locale,
      }),
    [monthEntries, month, people, rateOrNull, isBoss, t, locale],
  );

  const handleCopy = () => {
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
        {isBoss && (
          <WorkerMultiSelect
            workers={everyone.map((person) => ({ id: person.id, name: person.name }))}
            value={selectedIds}
            onChange={setSelectedIds}
            label={t.hours.salaryCalcWorkerLabel}
            allLabel={t.hours.salaryCalcAll}
            selectedLabel={(count) => fmt(t.hours.salaryCalcSelected, { n: count })}
            searchPlaceholder={t.companyUi.team.searchPlaceholder}
          />
        )}

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

        <div className="perf-t flex items-center justify-between gap-2 pt-2.5">
          <span className="min-w-0 text-[13px] text-ink-2">{t.hours.salaryCalcAmount}</span>
          <span className="tabular text-[18px] font-semibold whitespace-nowrap">
            {formatCurrency(amount, locale)}
          </span>
        </div>

        <Button variant="outline" block onClick={handleCopy}>
          {isCopied ? (
            <Check className="size-4" strokeWidth={1.9} aria-hidden />
          ) : (
            <Copy className="size-4" strokeWidth={1.9} aria-hidden />
          )}
          {isCopied ? t.hours.salaryCalcCopied : t.hours.salaryCalcCopy}
        </Button>
      </div>
    </section></Ticket>
  );
}
