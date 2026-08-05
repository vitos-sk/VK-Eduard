"use client";

import type { ReactNode } from "react";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface FiltersDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Наполнение появится позже — пока лист пустой, как и задумано в плане. */
  children?: ReactNode;
}

/**
 * Нижний лист фильтров: заголовок «Фільтри», место под содержимое
 * и кнопка «Скасувати». Общий для списков объектов и отчётов.
 */
export function FiltersDrawer({
  open,
  onOpenChange,
  children,
}: FiltersDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        // Описания у листа нет — гасим предупреждение Radix о aria-describedby
        aria-describedby={undefined}
        className={cn(
          "mx-auto max-w-[430px] border-border bg-surface text-text",
          // Отступ снизу под таб-бар — он остаётся видимым поверх листа.
          // В «телефоне по центру» под баром ещё 24px рамки — учитываем их.
          "pb-[calc(68px+env(safe-area-inset-bottom))] phone:pb-[calc(68px+1.5rem)]",
        )}
      >
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-[20px] font-bold text-text">
            {t.common.filters}
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4">{children}</div>

        <DrawerClose
          className={cn(
            "mx-4 mt-4 mb-3 flex h-[56px] items-center justify-center",
            "rounded-[14px] bg-surface-2 text-[15px] font-bold text-text",
            "transition-transform duration-150 active:scale-[0.98]",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          )}
        >
          {t.common.cancel}
        </DrawerClose>
      </DrawerContent>
    </Drawer>
  );
}
