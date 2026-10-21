"use client";

import Link from "next/link";
import { startOfMonth } from "date-fns";
import { Calculator } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";
import { dateKeyOf } from "@/modules/time/calc";

/** Кнопка «Калькулятор зарплати» на «Годинах»: открывает страницу калькулятора за выбранный месяц. */
export function SalaryLink({ month, className }: { month: Date; className?: string }) {
  const t = useT();

  return (
    <Button asChild variant="outline" size="wrap" block className={className}>
      <Link href={`/hours/salary?month=${dateKeyOf(startOfMonth(month)).slice(0, 7)}`}>
        <span className="flex min-w-0 items-center gap-1.5 text-left">
          <Calculator className="size-4 shrink-0" strokeWidth={1.9} aria-hidden />
          {t.hours.salaryCalcTitle}
        </span>
      </Link>
    </Button>
  );
}
