"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LazyCalendar, preloadCalendar } from "@/components/ui/lazy-calendar";
import { formatDateShort, fromDateKey, toDateKey } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";
import { DATE_FNS_LOCALES } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

interface DateRangeFieldProps {
  /** `YYYY-MM-DD` или пустая строка. */
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  fromLabel: string;
  toLabel: string;
  className?: string;
}

/**
 * Период «від — до» в нашем стиле: две кнопки-поля, по нажатию под ними раскрывается календарь
 * (а не системное поле даты — на iPhone оно выходит за края листа и показывает «мм/дд/гггг»).
 * Один день — одинаковые даты. Выбранную дату можно сбросить кнопкой в календаре.
 */
export function DateRangeField({ from, to, onChange, fromLabel, toLabel, className }: DateRangeFieldProps) {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState<"from" | "to" | null>(null);

  useEffect(() => {
    const id = window.setTimeout(preloadCalendar, 1500);
    return () => window.clearTimeout(id);
  }, []);

  const activeValue = open === "from" ? from : open === "to" ? to : "";
  const selected = activeValue ? fromDateKey(activeValue) : undefined;

  const pick = (date: Date | undefined) => {
    if (!open) return;

    const key = date ? toDateKey(date) : "";
    const next = open === "from" ? { from: key, to } : { from, to: key };

    // Начало позже конца — подтягиваем второй край, чтобы период не выворачивался.
    if (next.from && next.to && next.from > next.to) {
      if (open === "from") next.to = next.from;
      else next.from = next.to;
    }

    onChange(next);
    setOpen(null);
  };

  const field = (which: "from" | "to", value: string, label: string) => (
    <Button
      variant="field"
      size="field"
      className={cn("h-ctl-md gap-2 px-3", open === which && "border-primary")}
      onClick={() => setOpen((current) => (current === which ? null : which))}
      aria-expanded={open === which}
      aria-label={label}
    >
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-left text-[14px] font-semibold",
          value === "" && "font-medium text-text-dim",
        )}
      >
        {value ? formatDateShort(fromDateKey(value), locale) : label}
      </span>
      <CalendarDays className="size-4 shrink-0 text-primary" strokeWidth={1.9} aria-hidden />
    </Button>
  );

  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-2">
        {field("from", from, fromLabel)}
        {field("to", to, toLabel)}
      </div>

      {open && (
        <Card tone="muted" padding="none" className="mt-2 rounded-ctl p-1.5">
          <div className="flex justify-center">
            <LazyCalendar
              mode="single"
              selected={selected}
              defaultMonth={selected ?? (open === "to" && from ? fromDateKey(from) : undefined)}
              onSelect={pick}
              locale={DATE_FNS_LOCALES[locale]}
              disabled={
                open === "from" && to
                  ? { after: fromDateKey(to) }
                  : open === "to" && from
                    ? { before: fromDateKey(from) }
                    : undefined
              }
            />
          </div>

          {activeValue !== "" && (
            <Button variant="ghost" size="sm" block onClick={() => pick(undefined)}>
              {t.common.reset}
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
