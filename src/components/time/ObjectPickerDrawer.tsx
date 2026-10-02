"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";

import { Thumb } from "@/components/shared/Thumb";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { t } from "@/lib/i18n";
import { gradientForId } from "@/lib/siteGradient";
import type { Site } from "@/modules/sites/queries";
import { cn } from "@/lib/utils";
import { createSite } from "@/modules/sites/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface ObjectPickerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sites: readonly Site[];
  /** Выбранный объект или `null`, пока он не указан. */
  value: string | null;
  onSelect: (siteId: string) => void;
}

/** Нижний лист со списком объектов компании — выбор для поля «Об'єкт». */
export function ObjectPickerDrawer({
  open,
  onOpenChange,
  sites,
  value,
  onSelect,
}: ObjectPickerDrawerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");

  // Будь-який співробітник може завести об'єкт прямо тут, не втрачаючи
  // заповнену форму: після збереження список оновлюється, об'єкт обирається.
  const handleCreate = () => {
    startTransition(async () => {
      const result = await createSite({
        name: newName,
        kind: "",
        address: "",
        status: "in_progress",
      });

      if (result.error || !result.id) {
        toast(result.error ?? t.objects.form.saveError);
        return;
      }

      onSelect(result.id);
      setNewName("");
      setIsCreating(false);
      onOpenChange(false);
      router.refresh();
    });
  };

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
          {isCreating ? (
            <div className="flex gap-2">
              <Input
                autoFocus
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder={t.objects.form.namePlaceholder}
                aria-label={t.objects.form.nameLabel}
              />
              <Button onClick={handleCreate} disabled={newName.trim() === "" || isPending}>
                {t.objects.form.save}
              </Button>
            </div>
          ) : (
            <Button variant="outline" block onClick={() => setIsCreating(true)}>
              <Plus className="size-5" strokeWidth={2.4} aria-hidden />
              {t.objects.addObject}
            </Button>
          )}

          {sites.length === 0 && (
            <p className="px-1 py-3 text-[14px] font-medium text-text-muted">
              {t.manualTime.noObjects}
            </p>
          )}

          {sites.map((site) => {
            const isActive = site.id === value;

            return (
              <Card
                key={site.id}
                asChild
                tone="muted"
                padding="sm"
                interactive
                selected={isActive}
                className="flex w-full items-center gap-3"
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelect(site.id);
                    onOpenChange(false);
                  }}
                >
                <Thumb name={site.name} gradient={gradientForId(site.id)} size="sm" />

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold">
                    {site.name}
                  </span>
                  <span className="mt-0.5 block truncate text-[13px] font-medium text-text-muted">
                    {site.address ?? t.common.dash}
                  </span>
                </span>

                {isActive && (
                  <Check
                    className="size-5 shrink-0 text-primary"
                    strokeWidth={2.6}
                    aria-hidden
                  />
                )}
                </button>
              </Card>
            );
          })}
        </div>

        <DrawerClose
          className={cn(
            "mx-4 mt-4 mb-3 flex h-[56px] items-center justify-center",
            "rounded-[14px] bg-surface-2 text-[15px] font-bold text-text",
            "transition-transform duration-150 active:scale-[0.98]",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          )}
        >
          {t.common.cancel}
        </DrawerClose>
      </DrawerContent>
    </Drawer>
  );
}
