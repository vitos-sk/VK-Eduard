"use client";

import type { ReactNode } from "react";

import { ResponsiveSheet, SheetClose, SheetTitle } from "@/components/ui/responsive-sheet";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

interface FiltersDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Содержимое фильтров. Фильтры применяются сразу, лист лишь закрывается. */
  children?: ReactNode;
  /** Сброс всех фильтров; без него кнопка «Скинути» не показывается. */
  onReset?: () => void;
}

/**
 * Нижний лист фильтров: заголовок «Фільтри», содержимое,
 * кнопки «Скинути» и «Застосувати». Общий для списков объектов и отчётов.
 */
export function FiltersDrawer({
  open,
  onOpenChange,
  children,
  onReset,
}: FiltersDrawerProps) {
  const t = useT();
  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      mobileClassName={cn(
        "mx-auto max-w-[430px] border-border bg-surface text-text",
        // Отступ снизу под таб-бар — он остаётся видимым поверх листа.
        // В «телефоне по центру» под баром ещё 24px рамки — учитываем их.
        "pb-[calc(56px+env(safe-area-inset-bottom))] phone:pb-[calc(56px+1.5rem)]",
      )}
      desktopClassName="border-border bg-surface"
    >
        <div className="flex flex-col gap-0.5 p-4 pb-2 text-center lg:text-left">
          <SheetTitle className="text-[20px] font-semibold text-text">
            {t.common.filters}
          </SheetTitle>
        </div>

        <div className="max-h-[60dvh] overflow-y-auto px-4">{children}</div>

        <div className="mx-4 mt-4 mb-3 flex gap-2">
          {onReset && (
            <Button variant="outline" size="lg" className="flex-1" onClick={onReset}>
              {t.common.reset}
            </Button>
          )}
          <SheetClose asChild>
            <Button size="lg" className="flex-1">
              {t.common.apply}
            </Button>
          </SheetClose>
        </div>
    </ResponsiveSheet>
  );
}
