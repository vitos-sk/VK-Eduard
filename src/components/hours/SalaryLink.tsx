"use client";

import Link from "next/link";
import { startOfMonth } from "date-fns";
import { Calculator } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { dateKeyOf } from "@/modules/time/calc";

/** Кнопка «Калькулятор зарплати» на «Годинах»: открывает страницу калькулятора за выбранный месяц. */
export function SalaryLink({ month, className }: { month: Date; className?: string }) {
  const t = useT();

  return (
    <Button asChild variant="outline" block className={cn("h-auto min-h-ctl-lg justify-start px-3 py-1.5 text-[13px] leading-tight whitespace-normal", className)}>
      <Link href={`/hours/salary?month=${dateKeyOf(startOfMonth(month)).slice(0, 7)}`}>
        <span className="flex items-center gap-2 text-left">
          <Calculator className="size-4 shrink-0" strokeWidth={1.9} aria-hidden />
          {t.hours.salaryCalcTitle}
        </span>
      </Link>
    </Button>
  );
}
