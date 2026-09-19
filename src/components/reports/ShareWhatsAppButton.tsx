"use client";

import { useState } from "react";
import { ChevronDown, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { reportsStrings as s } from "@/lib/i18n/parts/reports";
import { cn } from "@/lib/utils";
import {
  buildExportUrl,
  HOURS_FORMATS,
  REPORTS_FORMATS,
  type ExportFormat,
  type ExportKind,
} from "@/modules/export/formats";

interface ShareWhatsAppButtonProps {
  from: string;
  to: string;
  kind?: ExportKind;
  workerId?: string;
  workerIds?: readonly string[];
  className?: string;
}

function extractFileName(disposition: string | null, fallback: string): string {
  if (!disposition) return fallback;
  const match = /filename="([^"]+)"/.exec(disposition);
  return match?.[1] ?? fallback;
}

/**
 * Скачує файл і намагається відкрити `wa.me` в новій вкладці.
 *
 * Використовується як фолбек, коли Web Share API (файли) недоступний, і
 * як «страховка» при провалі `navigator.share()` (наприклад, транзитна
 * user-activation вже згасла після мережевого запиту — на Safari/Firefox
 * це проявляється як `NotAllowedError`). У будь-якому разі файл на диску
 * гарантований, навіть якщо `window.open` заблокує попап-блокер — цю
 * платформну проблему з асинхронного колбека повністю усунути не можна.
 */
function downloadAndOpenWhatsApp(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);

  window.open(`https://wa.me/?text=${encodeURIComponent(s.whatsapp.fallbackText)}`, "_blank");
}

/**
 * Кнопка «Поділитися в WhatsApp» — качає той самий файл, що й «Експорт»,
 * і намагається віддати системне меню «Поділитися» (Web Share API рівня 2,
 * з файлами — Android Chrome, iOS Safari 15+). Десктоп і браузери без
 * підтримки файлового Web Share якщо просто скачують файл, а `wa.me`
 * відкривають з підказкою прикріпити його вручну: Web-версія WhatsApp не
 * приймає файли через посилання.
 */
export function ShareWhatsAppButton({
  from,
  to,
  kind = "hours",
  workerId,
  workerIds,
  className,
}: ShareWhatsAppButtonProps) {
  const [open, setOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const formats = kind === "reports" ? REPORTS_FORMATS : HOURS_FORMATS;

  const share = async (format: ExportFormat) => {
    setOpen(false);
    setIsSharing(true);

    try {
      const url = buildExportUrl({ from, to, format, kind, workerId, workerIds });
      const response = await fetch(url);

      if (!response.ok) throw new Error("export failed");

      const blob = await response.blob();
      const fileName = extractFileName(response.headers.get("Content-Disposition"), `export.${format}`);
      const file = new File([blob], fileName, { type: blob.type });

      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
          return;
        } catch (shareError) {
          if (shareError instanceof DOMException && shareError.name === "AbortError") return;
          // Транзитна user-activation могла згаснути (мережевий round-trip
          // перед цим) — файл уже завантажено в пам'ять, тож фолбечимось на
          // скачування + wa.me замість того, щоб просто показати помилку.
          downloadAndOpenWhatsApp(blob, fileName);
          return;
        }
      }

      downloadAndOpenWhatsApp(blob, fileName);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast(s.whatsapp.error);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={isSharing}
          className={cn(
            "flex h-10 items-center gap-2 rounded-[12px] bg-brand px-4",
            "text-[14px] font-bold text-brand-ink",
            "transition-transform duration-150 active:scale-[0.98] disabled:opacity-60",
            className,
          )}
        >
          <MessageCircle className="size-[16px]" strokeWidth={2} aria-hidden />
          {s.whatsapp.label}
          <ChevronDown className="size-[14px]" strokeWidth={2} aria-hidden />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-56 !bg-surface !text-text !ring-border">
        {formats.map(({ format, label, icon: Icon }) => (
          <button
            key={format}
            type="button"
            onClick={() => share(format)}
            className="flex h-10 w-full items-center gap-2 rounded-[8px] px-2 text-left text-[14px] font-semibold hover:bg-surface-2"
          >
            <Icon className="size-[16px] text-text-muted" strokeWidth={2} aria-hidden />
            {label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
