"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { endOfMonth, startOfMonth } from "date-fns";
import { Check, Copy, Share2 } from "lucide-react";

import { BackHeader } from "@/components/layout/ScreenHeader";
import { MonthNavigator } from "@/components/shared/MonthNavigator";
import { WorkerMultiSelect } from "@/components/shared/WorkerMultiSelect";
import { Button } from "@/components/ui/button";
import { Ticket } from "@/components/ui/ticket";
import { UnderlineField } from "@/components/ui/underline-field";
import { fmt, formatCurrency, formatHoursShort } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";
import { loadWithCache } from "@/lib/offline/cache";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/modules/auth/profile";
import { getCompanyEntriesInRange } from "@/modules/entries/queries";
import type { WorkEntryWithNames } from "@/modules/entries/types";
import {
  buildPayrollText,
  payrollAmount,
  payrollMinutes,
  type PayrollPerson,
} from "@/modules/payroll/format";
import { getCompanyWorkers } from "@/modules/team/queries";
import { dateKeyOf } from "@/modules/time/calc";

interface SalaryScreenProps {
  profile: Profile;
  /** `YYYY-MM-DD` любого дня выбранного в «Годинах» месяца. */
  initialDate: string;
}

/**
 * Страница «Калькулятор зарплати» (открывается кнопкой на «Годинах»): выбор сотрудников,
 * ставка и результат — готовый текст расчёта на языке приложения, который можно скопировать
 * или отправить. Результат пересчитывается на лету при смене сотрудников, ставки и месяца.
 * Ставка нигде не хранится — только на время открытой страницы.
 */
export function SalaryScreen({ profile, initialDate }: SalaryScreenProps) {
  const t = useT();
  const locale = useLocale();
  const supabase = useMemo(() => createClient(), []);
  const isBoss = profile.role === "boss";

  const [date, setDate] = useState<Date>(() => new Date(`${initialDate}T00:00:00`));
  const [entries, setEntries] = useState<readonly WorkEntryWithNames[]>([]);
  const [workers, setWorkers] = useState<readonly PayrollPerson[]>([]);
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [rate, setRate] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  // «Поделиться» есть не везде (на компьютерах часто нет) — кнопку показываем только там, где работает.
  const canShare = useSyncExternalStore(
    () => () => {},
    () => typeof navigator.share === "function",
    () => false,
  );

  // Смены месяца: рабочему приходят свои, шефу — все по компании (RLS). Сначала сохранённое, потом свежее.
  useEffect(() => {
    let cancelled = false;
    const from = dateKeyOf(startOfMonth(date));
    const to = dateKeyOf(endOfMonth(date));

    loadWithCache({
      key: `${profile.id}:entries:${from}:${to}`,
      fetcher: () => getCompanyEntriesInRange(supabase, profile.company_id, from, to),
      onData: (data) => setEntries(data),
      isCancelled: () => cancelled,
    }).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [supabase, profile.company_id, profile.id, date]);

  useEffect(() => {
    if (!isBoss) return;

    let cancelled = false;

    loadWithCache({
      key: `${profile.id}:workers`,
      fetcher: () => getCompanyWorkers(supabase, profile.company_id),
      onData: (data) => setWorkers(data.map((worker) => ({ id: worker.id, name: worker.full_name }))),
      isCancelled: () => cancelled,
    }).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [supabase, isBoss, profile.company_id, profile.id]);

  // Список для выбора: сам пользователь первым (с пометкой «Я»), затем остальные.
  const everyone = useMemo<PayrollPerson[]>(() => {
    if (!isBoss) return [{ id: profile.id, name: profile.full_name }];

    return [
      { id: profile.id, name: profile.full_name },
      ...workers.filter((worker) => worker.id !== profile.id),
    ];
  }, [isBoss, profile.id, profile.full_name, workers]);

  const selectOptions = useMemo(
    () =>
      everyone.map((person) => ({
        id: person.id,
        name: person.id === profile.id ? `${person.name} (${t.hours.salaryCalcSelf})` : person.name,
      })),
    [everyone, profile.id, t.hours.salaryCalcSelf],
  );

  // Пустой выбор — все; иначе только отмеченные, в порядке списка.
  const people = useMemo(
    () => (selectedIds.length === 0 ? everyone : everyone.filter((person) => selectedIds.includes(person.id))),
    [everyone, selectedIds],
  );

  const rateNumber = Number(rate.replace(",", "."));
  const rateOrNull = rate.trim() !== "" && Number.isFinite(rateNumber) && rateNumber >= 0 ? rateNumber : null;

  const minutes = payrollMinutes(entries, people);
  const amount = payrollAmount(entries, people, rateOrNull);

  const text = useMemo(
    () =>
      buildPayrollText({
        entries,
        monthDate: date,
        people,
        rate: rateOrNull,
        // Имя в расчёте нужно, когда он не только про самого пользователя.
        showNames: isBoss,
        t,
        locale,
      }),
    [entries, date, people, rateOrNull, isBoss, t, locale],
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

  const handleShare = () => {
    // Закрыли меню «Поделиться» — это не ошибка, молча ничего не делаем.
    navigator.share({ text }).catch(() => {});
  };

  return (
    <div className="pb-6">
      <BackHeader title={t.hours.salaryCalcTitle} href="/hours" />

      <div className="space-y-3 px-4 lg:mx-auto lg:max-w-[640px] lg:px-0">
        <MonthNavigator date={date} onChange={setDate} />

        <Ticket asChild variant="flat">
          <section className="flex flex-col gap-3">
            {isBoss && (
              <WorkerMultiSelect
                workers={selectOptions}
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
          </section>
        </Ticket>

        <Ticket asChild variant="flat">
          <section>
            <h2 className="text-[15px] font-semibold">{t.hours.salaryCalcResult}</h2>

            <div className="mt-2 flex items-end justify-between gap-3">
              <div>
                <p className="text-[12px] text-ink-2">{t.hours.salaryCalcTotalHours}</p>
                <p className="tabular text-[20px] font-semibold">{formatHoursShort(minutes)}</p>
              </div>
              <div className="text-right">
                <p className="text-[12px] text-ink-2">{t.hours.salaryCalcAmount}</p>
                <p className="tabular text-[20px] font-semibold whitespace-nowrap">
                  {amount === null ? t.common.dash : formatCurrency(amount, locale)}
                </p>
              </div>
            </div>

            {/* select-text: на сайте выделение выключено, а расчёт можно выделить и скопировать вручную */}
            <pre className="tabular perf-t mt-3 max-h-[50dvh] overflow-auto pt-3 text-[13px] leading-relaxed whitespace-pre-wrap text-text select-text">
              {text}
            </pre>
          </section>
        </Ticket>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button block onClick={handleCopy}>
            {isCopied ? (
              <Check className="size-[18px]" strokeWidth={1.9} aria-hidden />
            ) : (
              <Copy className="size-[18px]" strokeWidth={1.9} aria-hidden />
            )}
            {isCopied ? t.hours.salaryCalcCopied : t.hours.salaryCalcCopy}
          </Button>

          {canShare && (
            <Button variant="outline" block onClick={handleShare}>
              <Share2 className="size-[18px]" strokeWidth={1.9} aria-hidden />
              {t.hours.salaryCalcShare}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
