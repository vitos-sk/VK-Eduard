"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal, ModalClose, ModalContent, ModalTitle } from "@/components/ui/modal";
import { fmt } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

interface PhotoLightboxProps {
  urls: readonly string[];
  /** Номер открытого фото; `null` — закрыто. */
  index: number | null;
  onIndexChange: (index: number) => void;
  onOpenChange: (open: boolean) => void;
  title: string;
}

/** Сдвиг пальца/мыши (px), с которого жест считается пролистыванием, а не тапом. */
const SWIPE_THRESHOLD = 50;

/**
 * Полноэкранный просмотр фото с листанием: свайп влево/вправо, стрелки на экране,
 * клавиши ← →. Закрыть — тапом по фото или большой кнопкой «Закрити» внизу по центру:
 * на iPhone она там, куда достаёт большой палец, и не лезет под статус-бар.
 */
export function PhotoLightbox({ urls, index, onIndexChange, onOpenChange, title }: PhotoLightboxProps) {
  const t = useT();
  const start = useRef<{ x: number; y: number } | null>(null);
  const isOpen = index !== null && urls[index] !== undefined;
  const hasPrev = isOpen && index > 0;
  const hasNext = isOpen && index < urls.length - 1;

  const go = (delta: number) => {
    if (index === null) return;

    const next = index + delta;
    if (next >= 0 && next < urls.length) onIndexChange(next);
  };

  // Стрелки клавиатуры (на компьютере).
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // Соседние фото подгружаем заранее — при листании не мигает.
  useEffect(() => {
    if (index === null) return;

    for (const neighbour of [urls[index - 1], urls[index + 1]]) {
      if (neighbour) new Image().src = neighbour;
    }
  }, [index, urls]);

  return (
    <Modal open={isOpen} onOpenChange={onOpenChange}>
      <ModalContent
        showCloseButton={false}
        className={cn(
          "top-0 left-0 grid h-dvh w-screen max-w-none translate-x-0 translate-y-0 place-items-center gap-0",
          "rounded-none border-none bg-ink p-0",
        )}
      >
        <ModalTitle className="sr-only">{title}</ModalTitle>

        {/* Область фото: жест различает тап (закрыть) и свайп (листать) */}
        <div
          className="flex size-full touch-pan-y items-center justify-center px-2 pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+96px)] select-none"
          onPointerDown={(event) => {
            start.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerUp={(event) => {
            const origin = start.current;
            start.current = null;
            if (!origin) return;

            const dx = event.clientX - origin.x;
            const dy = event.clientY - origin.y;

            if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
              go(dx < 0 ? 1 : -1);
            } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
              onOpenChange(false);
            }
          }}
          onPointerCancel={() => {
            start.current = null;
          }}
        >
          {isOpen && (
            // eslint-disable-next-line @next/next/no-img-element -- подписанная ссылка Storage, полноэкранный просмотр
            <img
              src={urls[index]}
              alt=""
              draggable={false}
              className="max-h-full max-w-full object-contain"
            />
          )}
        </div>

        {isOpen && urls.length > 1 && (
          <p
            aria-live="polite"
            className="pointer-events-none absolute top-[calc(env(safe-area-inset-top)+16px)] left-1/2 -translate-x-1/2 rounded-md bg-scrim px-3 py-1 text-[14px] font-semibold text-on-scrim tabular"
          >
            {fmt("{n} / {total}", { n: index + 1, total: urls.length })}
          </p>
        )}

        {hasPrev && (
          <Button
            variant="scrim"
            size="icon"
            aria-label={t.reportDetail.prevPhoto}
            onClick={() => go(-1)}
            className="absolute top-1/2 left-3 -translate-y-1/2"
          >
            <ChevronLeft className="size-6" strokeWidth={2} aria-hidden />
          </Button>
        )}

        {hasNext && (
          <Button
            variant="scrim"
            size="icon"
            aria-label={t.reportDetail.nextPhoto}
            onClick={() => go(1)}
            className="absolute top-1/2 right-3 -translate-y-1/2"
          >
            <ChevronRight className="size-6" strokeWidth={2} aria-hidden />
          </Button>
        )}

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
