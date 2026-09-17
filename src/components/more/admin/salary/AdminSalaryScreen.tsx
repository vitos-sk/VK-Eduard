"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { endOfMonth, startOfMonth } from "date-fns";

import { PeriodNavigator } from "@/components/hours/PeriodNavigator";
import { SalaryCalculator } from "@/components/hours/SalaryCalculator";
import { ExportMenu } from "@/components/reports/ExportMenu";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Profile } from "@/modules/auth/profile";
import { getCompanyEntriesInRange } from "@/modules/entries/queries";
import type { WorkEntryWithNames } from "@/modules/entries/types";
import { dateKeyOf } from "@/modules/time/calc";

interface AdminSalaryScreenProps {
  profile: Profile;
  initialEntries: readonly WorkEntryWithNames[];
}

function addMonthsSafe(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

/**
 * Розділ «Зарплата» адмінки. Ставка ніде не зберігається (в БД такого поля
 * немає), тому MVP — швидке перемикання місяця й співробітника поверх уже
 * готового `SalaryCalculator` (та сама схема, що і на вкладці «Місяць»
 * екрана «Години», але `isBoss` завжди `true` і дані — по всій компанії).
 */
export function AdminSalaryScreen({ profile, initialEntries }: AdminSalaryScreenProps) {
  const supabase = useMemo(() => createClient(), []);

  const [month, setMonth] = useState(() => new Date());
  const [entries, setEntries] = useState<readonly WorkEntryWithNames[]>(initialEntries);
  const [isLoading, startLoadTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    const from = dateKeyOf(startOfMonth(month));
    const to = dateKeyOf(endOfMonth(month));

    startLoadTransition(async () => {
      try {
        const data = await getCompanyEntriesInRange(supabase, profile.company_id, from, to);
        if (!cancelled) setEntries(data);
      } catch {
        // Мережа моргнула — лишаємо попередні дані на екрані.
      }
    });

    return () => {
      cancelled = true;
    };
  }, [supabase, profile.company_id, month]);

  const monthFrom = dateKeyOf(startOfMonth(month));
  const monthTo = dateKeyOf(endOfMonth(month));
  const monthTitle = `${t.months.nominative[month.getMonth()]} ${month.getFullYear()}`;

  return (
    <div className="flex flex-col gap-4 px-4 pb-24 lg:px-0 lg:pb-0">
      <PeriodNavigator
        title={monthTitle}
        onPrev={() => setMonth((current) => addMonthsSafe(current, -1))}
        onNext={() => setMonth((current) => addMonthsSafe(current, 1))}
        className="lg:max-w-[560px]"
      />

      <p className="text-[13px] font-medium text-text-muted lg:max-w-[560px]">
        {t.admin.salary.subtitle}
      </p>

      <div
        className={cn(
          "transition-opacity",
          isLoading && "pointer-events-none opacity-60",
        )}
      >
        <SalaryCalculator
          monthTitle={monthTitle}
          selfId={profile.id}
          isBoss
          companyId={profile.company_id}
          monthEntries={entries}
          className="lg:max-w-[560px]"
        />
      </div>

      <div className="flex items-center justify-between gap-2 rounded-[16px] border border-border bg-surface p-3.5 lg:max-w-[560px]">
        <p className="text-[13px] font-bold text-text-muted">{t.admin.salary.exportHint}</p>
        <ExportMenu from={monthFrom} to={monthTo} />
      </div>
    </div>
  );
}
