"use client";

import { useState } from "react";
import { ChevronDown, Download } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { buildExportUrl, HOURS_FORMATS, REPORTS_FORMATS, type ExportKind } from "@/modules/export/formats";

interface ExportMenuProps {
  /** `YYYY-MM-DD` — диапазон уже посчитан вызывающим экраном (месяц/период). */
  from: string;
  to: string;
  /** «Години» (за замовчуванням) чи «Звіти» — інший набір колонок і форматів. */
  kind?: ExportKind;
  /** Экспорт по одному робітнику — для детальної сторінки в «Команді». */
  workerId?: string;
  /** Мультивибір з чекбоксів в адмінці (`/more/team`) — пріоритетний над `workerId`. */
  workerIds?: readonly string[];
  className?: string;
}

/**
 * Кнопка «Експорт» з випадаючим списком форматів. `kind="hours"` (за замовч.) —
 * той самий CSV/Excel/PDF-табель, що й раніше; `kind="reports"` — новий CSV
 * звітів (дата/робітник/об'єкт/категорії/опис/фото, без часу).
 */
export function ExportMenu({ from, to, kind = "hours", workerId, workerIds, className }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const formats = kind === "reports" ? REPORTS_FORMATS : HOURS_FORMATS;
  const label = kind === "reports" ? t.export.labelReports : t.export.label;

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
          {label}
          <ChevronDown className="size-[14px]" strokeWidth={2} aria-hidden />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-56 !bg-surface !text-text !ring-border">
        {formats.map(({ format, label: formatLabel, icon: Icon }) => (
          <a
            key={format}
            href={buildExportUrl({ from, to, format, kind, workerId, workerIds })}
            onClick={() => setOpen(false)}
            className="flex h-10 items-center gap-2 rounded-[8px] px-2 text-[14px] font-semibold hover:bg-surface-2"
          >
            <Icon className="size-[16px] text-text-muted" strokeWidth={2} aria-hidden />
            {formatLabel}
          </a>
        ))}
      </PopoverContent>
    </Popover>
  );
}
