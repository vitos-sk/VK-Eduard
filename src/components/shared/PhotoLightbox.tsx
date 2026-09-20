"use client";

import { Modal, ModalContent, ModalTitle } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

interface PhotoLightboxProps {
  /** `null` — закрито. */
  url: string | null;
  onOpenChange: (open: boolean) => void;
  title: string;
}

/**
 * Повноекранний перегляд одного фото — відкривається кліком по мініатюрі
 * в `ReportPhotoUploader`/`AdminReportCard`. Той самий `Modal`, що й
 * усюди в застосунку, тільки без картки: чорне тло, фото по центру
 * (`object-contain`, не обрізає), закриття — хрестик або клік поза фото.
 */
export function PhotoLightbox({ url, onOpenChange, title }: PhotoLightboxProps) {
  return (
    <Modal open={url !== null} onOpenChange={onOpenChange}>
      <ModalContent
        showCloseButton
        className={cn(
          "flex h-[100dvh] w-screen max-w-none items-center justify-center",
          "rounded-none border-none bg-scrim-strong p-0 shadow-none",
          "[&_[data-slot=dialog-close]]:bg-scrim [&_[data-slot=dialog-close]]:text-on-scrim",
        )}
      >
        <ModalTitle className="sr-only">{title}</ModalTitle>
        {url && (
          // eslint-disable-next-line @next/next/no-img-element -- подписанная ссылка Storage, повноекранний перегляд
          <img src={url} alt="" className="max-h-full max-w-full object-contain" />
        )}
      </ModalContent>
    </Modal>
  );
}
