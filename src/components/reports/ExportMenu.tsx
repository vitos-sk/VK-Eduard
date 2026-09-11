"use client";

import { useState } from "react";
import { ChevronDown, Download, FileSpreadsheet, FileText } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface ExportMenuProps {
  /** `YYYY-MM-DD` — диапазон уже посчитан вызывающим экраном (месяц/период). */
  from: string;
  to: string;
  /** Экспорт по одному робітнику — для детальної сторінки в «Команді». */
  workerId?: string;
  className?: string;
}

const FORMATS = [
  { format: "csv", label: t.admin.export.csv, icon: Download },
  { format: "xlsx", label: t.admin.export.xlsx, icon: FileSpreadsheet },
  { format: "pdf", label: t.admin.export.pdf, icon: FileText },
] as const;

/**
 * Кнопка «Експорт» з випадаючим списком форматів — CSV (як і раніше),
 * Excel і PDF-табель (`docs/ROADMAP.md`, етап 6 доповнений десктоп-адмінкою).
 * Посилання ведуть на той самий `api/export/route.ts`, формат — у `?format=`.
 */
export function ExportMenu({ from, to, workerId, className }: ExportMenuProps) {
  const [open, setOpen] = useState(false);

  const hrefFor = (format: string) => {
    const params = new URLSearchParams({ from, to, format });
    if (workerId) params.set("workerId", workerId);
    return `/api/export?${params.toString()}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-10 items-center gap-2 rounded-[12px] border border-border px-4",
            "text-[14px] font-bold text-text",
            "transition-transform duration-150 active:scale-[0.98]",
            className,
          )}
        >
          <Download className="size-[16px]" strokeWidth={2} aria-hidden />
          {t.admin.export.label}
          <ChevronDown className="size-[14px]" strokeWidth={2} aria-hidden />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-56 !bg-surface !text-text !ring-border">
        {FORMATS.map(({ format, label, icon: Icon }) => (
          <a
            key={format}
            href={hrefFor(format)}
            onClick={() => setOpen(false)}
            className="flex h-10 items-center gap-2 rounded-[8px] px-2 text-[14px] font-semibold hover:bg-surface-2"
          >
            <Icon className="size-[16px] text-text-muted" strokeWidth={2} aria-hidden />
            {label}
          </a>
        ))}
      </PopoverContent>
    </Popover>
  );
}
