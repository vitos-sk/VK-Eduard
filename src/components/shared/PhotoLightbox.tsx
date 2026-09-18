"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface PhotoLightboxProps {
  /** `null` — закрито. */
  url: string | null;
  onOpenChange: (open: boolean) => void;
  title: string;
}

/**
 * Повноекранний перегляд одного фото — відкривається кліком по мініатюрі
 * в `ReportPhotoUploader`/`AdminReportCard`. Той самий `Dialog`, що й
 * усюди в застосунку, тільки без картки: чорне тло, фото по центру
 * (`object-contain`, не обрізає), закриття — хрестик або клік поза фото.
 */
export function PhotoLightbox({ url, onOpenChange, title }: PhotoLightboxProps) {
  return (
    <Dialog open={url !== null} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "flex h-[100dvh] w-screen max-w-none items-center justify-center",
          "rounded-none border-none bg-black/95 p-0 shadow-none",
          "[&_[data-slot=dialog-close]]:bg-black/50 [&_[data-slot=dialog-close]]:text-white",
        )}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {url && (
          // eslint-disable-next-line @next/next/no-img-element -- подписанная ссылка Storage, повноекранний перегляд
          <img src={url} alt="" className="max-h-full max-w-full object-contain" />
        )}
      </DialogContent>
    </Dialog>
  );
}
