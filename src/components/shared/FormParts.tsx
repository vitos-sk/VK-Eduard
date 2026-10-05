"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Pointer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LazyCalendar as Calendar, preloadCalendar } from "@/components/ui/lazy-calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TicketSection } from "@/components/ui/ticket";
import { formatDateLong } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";
import { DATE_FNS_LOCALES } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

/**
 * Верхняя строка экранов-форм: кнопка-шеврон «Назад» (только иконка) слева,
 * необязательное действие справа, под ней заголовок 22 / 600.
 */
export function FormTopBar({
  title,
  onBack,
  action,
  children,
}: {
  title: string;
  onBack: () => void;
  action?: ReactNode;
  /** Строка под заголовком (дата). */
  children?: ReactNode;
}) {
  const t = useT();
  return (
    <header className="px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] lg:px-0 lg:pt-0">
      <div className="flex min-h-8 items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          className="-ml-1.5"
          onClick={onBack}
          aria-label={t.common.back}
        >
          <ChevronLeft className="size-5" strokeWidth={1.9} aria-hidden />
        </Button>
        {action}
      </div>
      <h1 className="mt-0.5 text-[22px] leading-tight font-semibold tracking-tight lg:text-[24px]">
        {title}
      </h1>
      {children}
    </header>
  );
}

/** Дата под заголовком; тап открывает календарь. */
export function DatePickLink({
  date,
  onChange,
}: {
  date: Date;
  onChange: (date: Date) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  // Подтягиваем календарь заранее, в простое: к нажатию он уже загружен (и лежит в кэше для офлайна).
  useEffect(() => {
    const id = window.setTimeout(preloadCalendar, 1500);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t.hours.pickDate}
          className="relative mt-0.5 flex items-center gap-1.5 text-[14px] font-medium text-primary outline-none hover:text-primary-hover before:absolute before:-inset-y-3 before:inset-x-0 before:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span className="underline decoration-primary decoration-dashed underline-offset-4">
            {formatDateLong(date, locale)}
          </span>
          {/* Палец-указатель: дату можно нажать и выбрать другую */}
          <Pointer className="size-5 shrink-0" strokeWidth={1.9} aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto border border-edge bg-ticket p-2">
        <Calendar
          mode="single"
          selected={date}
          defaultMonth={date}
          onSelect={(next) => {
            if (next) {
              onChange(next);
              setOpen(false);
            }
          }}
          locale={DATE_FNS_LOCALES[locale]}
        />
      </PopoverContent>
    </Popover>
  );
}

/** Строка-пикер в талоне: подпись 12 px, значение 14 / 500, шеврон. */
export function PickerRow({
  label,
  value,
  placeholder,
  onClick,
  className,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <TicketSection className={cn("p-0", className)}>
      <button
        type="button"
        onClick={onClick}
        className="block w-full px-3.5 py-2.5 text-left outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <span className="block text-[12px] text-ink-2">{label}</span>
        <span className="mt-0.5 flex items-center justify-between gap-2">
          <span className={cn("truncate text-[14px] font-medium", !value && "text-ink-3")}>
            {value ?? placeholder}
          </span>
          <ChevronRight className="size-4 shrink-0 text-ink-3" strokeWidth={1.9} aria-hidden />
        </span>
      </button>
    </TicketSection>
  );
}

/** Нижняя панель с главной кнопкой экрана-формы: липнет к низу области прокрутки. */
export function StickyActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="perf-t sticky bottom-0 z-10 mt-4 bg-paper px-4 py-2.5 lg:px-0">{children}</div>
  );
}
