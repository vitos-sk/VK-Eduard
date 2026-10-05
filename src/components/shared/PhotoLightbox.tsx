"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal, ModalClose, ModalContent, ModalTitle } from "@/components/ui/modal";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

interface PhotoLightboxProps {
  /** `null` — закрито. */
  url: string | null;
  onOpenChange: (open: boolean) => void;
  title: string;
}

/**
 * Повноекранний перегляд одного фото. Закрити можна тапом по фото або великою кнопкою
 * «Закрити» знизу по центру: на iPhone вона там, куди дістає великий палець, і не лізе
 * під статус-бар та «острівець», як хрестик у верхньому куті.
 */
export function PhotoLightbox({ url, onOpenChange, title }: PhotoLightboxProps) {
  const t = useT();
  return (
    <Modal open={url !== null} onOpenChange={onOpenChange}>
      <ModalContent
        showCloseButton={false}
        className={cn(
          "top-0 left-0 grid h-dvh w-screen max-w-none translate-x-0 translate-y-0 place-items-center gap-0",
          "rounded-none border-none bg-ink p-0",
        )}
      >
        <ModalTitle className="sr-only">{title}</ModalTitle>

        <ModalClose asChild>
          <button
            type="button"
            aria-label={t.common.close}
            className="flex size-full items-center justify-center px-2 pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+96px)] outline-none"
          >
            {url && (
              // eslint-disable-next-line @next/next/no-img-element -- подписанная ссылка Storage, повноекранний перегляд
              <img src={url} alt="" className="max-h-full max-w-full object-contain" />
            )}
          </button>
        </ModalClose>

        <ModalClose asChild>
          <Button
            variant="outline"
            className="absolute bottom-[calc(env(safe-area-inset-bottom)+20px)] left-1/2 h-12 -translate-x-1/2 gap-2 px-6 text-[16px]"
          >
            <X className="size-5" strokeWidth={2.2} aria-hidden />
            {t.common.close}
          </Button>
        </ModalClose>
      </ModalContent>
    </Modal>
  );
}
