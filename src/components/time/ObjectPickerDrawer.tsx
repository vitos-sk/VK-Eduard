"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";

import { ResponsiveSheet, SheetClose, SheetTitle } from "@/components/ui/responsive-sheet";
import { useT } from "@/lib/i18n/client";
import type { Site } from "@/modules/sites/queries";
import { cn } from "@/lib/utils";
import { createSite } from "@/modules/sites/actions";
import { Button } from "@/components/ui/button";
import { Ticket } from "@/components/ui/ticket";
import { UnderlineField } from "@/components/ui/underline-field";

interface ObjectPickerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sites: readonly Site[];
  /** Выбранный объект или `null`, пока он не указан. */
  value: string | null;
  onSelect: (siteId: string) => void;
}

/** Лист со списком объектов компании — выбор для поля «Об'єкт» (нижний лист на телефоне, окно на ПК). */
export function ObjectPickerDrawer({
  open,
  onOpenChange,
  sites,
  value,
  onSelect,
}: ObjectPickerDrawerProps) {
  const t = useT();
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
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      mobileClassName={cn(
        "mx-auto max-w-[560px] border-edge bg-ticket text-text",
        // Отступ снизу под таб-бар — он остаётся видимым поверх листа.
        "pb-[calc(60px+env(safe-area-inset-bottom))]",
        "data-[vaul-drawer-direction=bottom]:max-h-[92dvh]",
      )}
      desktopClassName="border-edge bg-ticket"
    >
        <div className="flex flex-col gap-0.5 p-4 pb-2 text-center lg:text-left">
          <SheetTitle className="text-[20px] font-semibold text-text">
            {t.manualTime.selectObject}
          </SheetTitle>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pt-1 pb-1">
          {isCreating ? (
            <div className="flex items-end gap-3">
              <UnderlineField
                className="flex-1"
                autoFocus
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder={t.objects.form.namePlaceholder}
                aria-label={t.objects.form.nameLabel}
              />
              <Button onClick={handleCreate} disabled={newName.trim() === ""} loading={isPending}>
                {t.objects.form.save}
              </Button>
            </div>
          ) : (
            <Button variant="outline" block onClick={() => setIsCreating(true)}>
              <Plus className="size-5" strokeWidth={1.9} aria-hidden />
              {t.objects.addObject}
            </Button>
          )}

          {sites.length === 0 && (
            <p className="px-1 py-3 text-[14px] text-ink-2">
              {t.manualTime.noObjects}
            </p>
          )}

          {sites.map((site) => {
            const isActive = site.id === value;

            return (
              <Ticket
                key={site.id}
                asChild
                variant="flat"
                interactive
                className={cn("flex w-full items-center gap-3 py-2.5", isActive && "border-primary bg-primary-tint")}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelect(site.id);
                    onOpenChange(false);
                  }}
                >
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-[14px] font-medium">{site.name}</span>
                    <span className="block truncate text-[12px] text-ink-2">
                      {site.address ?? t.common.dash}
                    </span>
                  </span>

                  {isActive && (
                    <Check className="size-4 shrink-0 text-primary" strokeWidth={1.9} aria-hidden />
                  )}
                </button>
              </Ticket>
            );
          })}
        </div>

        <SheetClose
          className={cn(
            "mx-4 mt-4 mb-3 flex h-ctl-md items-center justify-center",
            "rounded-ctl border border-primary bg-ticket text-[15px] font-semibold text-primary",
            "transition-colors hover:bg-primary-tint",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          )}
        >
          {t.common.cancel}
        </SheetClose>
    </ResponsiveSheet>
  );
}
