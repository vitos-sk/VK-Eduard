"use client";

import { Check } from "lucide-react";

import { Thumb } from "@/components/shared/Thumb";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { t } from "@/lib/i18n";
import { objects } from "@/lib/mock/objects";
import { cn } from "@/lib/utils";

interface ObjectPickerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Выбранный объект или `null`, пока он не указан. */
  value: string | null;
  onSelect: (objectId: string) => void;
}

/** Нижний лист со списком всех объектов — выбор для поля «Об'єкт». */
export function ObjectPickerDrawer({
  open,
  onOpenChange,
  value,
  onSelect,
}: ObjectPickerDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        aria-describedby={undefined}
        className={cn(
          "mx-auto max-w-[430px] border-border bg-surface text-text",
          // Отступ снизу под таб-бар — он остаётся видимым поверх листа.
          "pb-[calc(68px+env(safe-area-inset-bottom))] phone:pb-[calc(68px+1.5rem)]",
          "data-[vaul-drawer-direction=bottom]:max-h-[92dvh]",
        )}
      >
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-[20px] font-bold text-text">
            {t.manualTime.selectObject}
          </DrawerTitle>
        </DrawerHeader>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pt-1 pb-1">
          {objects.map((object) => {
            const isActive = object.id === value;

            return (
              <button
                key={object.id}
                type="button"
                onClick={() => {
                  onSelect(object.id);
                  onOpenChange(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[16px] border p-3 text-left",
                  "transition-transform duration-150 active:scale-[0.98]",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                  isActive
                    ? "border-brand bg-brand/10"
                    : "border-border bg-surface-2",
                )}
              >
                <Thumb
                  name={object.name}
                  gradient={object.gradient}
                  size="sm"
                />

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold">
                    {object.name}
                  </span>
                  <span className="mt-0.5 block truncate text-[13px] font-medium text-text-muted">
                    {object.address}
                  </span>
                </span>

                {isActive && (
                  <Check
                    className="size-5 shrink-0 text-brand"
                    strokeWidth={2.6}
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>

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
