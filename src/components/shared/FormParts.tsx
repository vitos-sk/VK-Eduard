"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Pointer } from "lucide-react";

import { STICKY_BAR } from "@/components/layout/stickyBar";
import { Button } from "@/components/ui/button";
import { LazyCalendar as Calendar, preloadCalendar } from "@/components/ui/lazy-calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TicketSection } from "@/components/ui/ticket";
import { formatDateLong } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";
import { DATE_FNS_LOCALES } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

/**
 * Верхняя строка экранов-форм. Телефон: закреплённая тонкая полоса — шеврон «Назад», заголовок 17 / 600,
 * необязательное действие справа; строка под заголовком (`children`, дата) идёт под полосой и уезжает вместе с контентом.
 * Компьютер: шеврон и действие в строке, под ней заголовок 24 / 600 и `children`.
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
    <>
      <header
        className={cn(
          "grid min-h-8 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-1.5 px-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-x-2 lg:px-0",
          STICKY_BAR,
          "lg:pb-0",
        )}
      >
        <Button
          variant="ghost"
          size="icon-sm"
          className="col-start-1 row-start-1 -ml-1.5 justify-self-start"
          onClick={onBack}
          aria-label={t.common.back}
        >
          <ChevronLeft className="size-5" strokeWidth={1.9} aria-hidden />
        </Button>
        <h1 className="col-start-2 row-start-1 text-[17px] leading-tight font-semibold tracking-tight max-lg:truncate lg:col-span-2 lg:col-start-1 lg:row-start-2 lg:mt-0.5 lg:text-[24px]">
          {title}
        </h1>
        <div className="col-start-3 row-start-1 justify-self-end lg:col-start-2">{action}</div>
      </header>
      {children && <div className="px-4 pt-1.5 lg:px-0 lg:pt-0">{children}</div>}
    </>
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

/** Подпись над полем формы: 13 / 500, справа необязательная подсказка («Оберіть одне або кілька»). */
export function FieldLabel({
  id,
  hint,
  className,
  children,
}: {
  id?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={cn("mb-1.5 flex items-baseline justify-between gap-2", className)}>
      <span id={id} className="text-[13px] font-medium text-text">
        {children}
      </span>
      {hint && <span className="shrink-0 text-[12px] text-ink-2">{hint}</span>}
    </span>
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

/**
 * Нижняя панель с главной кнопкой экрана-формы: липнет к низу области прокрутки.
 *
 * На телефоне у области прокрутки внизу отступ 24 px (`pb-6` в `AppShell`), и «липкая» панель
 * останавливалась над ним — под кнопкой мелькало содержимое формы. Поэтому панель опущена на эти
 * 24 px (`-bottom-6`) и сама добирает их своим нижним отступом: полоса под кнопкой закрыта фоном.
 */
export function StickyActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky -bottom-6 z-10 mt-4 bg-paper px-4 pt-2.5 pb-[calc(0.625rem+1.5rem)] lg:bottom-0 lg:px-0 lg:py-2.5">
      {children}
    </div>
  );
}
