"use client";

import Link from "next/link";
import { startOfMonth } from "date-fns";
import { Calculator, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { dateKeyOf } from "@/modules/time/calc";

/** Кнопка «Калькулятор зарплати» на «Годинах»: открывает страницу калькулятора за выбранный месяц. */
export function SalaryLink({ month, className }: { month: Date; className?: string }) {
  const t = useT();

  return (
    <Button asChild variant="outline" block className={cn("justify-between px-4", className)}>
      <Link href={`/hours/salary?month=${dateKeyOf(startOfMonth(month)).slice(0, 7)}`}>
        <span className="flex items-center gap-2">
          <Calculator className="size-[18px]" strokeWidth={1.9} aria-hidden />
          {t.hours.salaryCalcTitle}
        </span>
        <ChevronRight className="size-4 text-text-dim" strokeWidth={1.9} aria-hidden />
      </Link>
    </Button>
  );
}
