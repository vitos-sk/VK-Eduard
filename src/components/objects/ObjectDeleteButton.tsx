"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { t } from "@/lib/i18n";
import { deleteSite } from "@/modules/sites/actions";
import { cn } from "@/lib/utils";

interface ObjectDeleteButtonProps {
  siteId: string;
  className?: string;
}

/**
 * Кнопка остаточного видалення об'єкта з підтвердженням — тільки boss,
 * на відміну від `ObjectArchiveButton` об'єкт перестає існувати. Після
 * успіху йдемо на список: детальна сторінка більше не існує.
 */
export function ObjectDeleteButton({ siteId, className }: ObjectDeleteButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await deleteSite(siteId);

      if (result.error) {
        toast(result.error);
        return;
      }

      setOpen(false);
      router.push("/objects");
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-12 w-full items-center justify-center gap-2 rounded-[14px]",
          "border border-danger/40 text-[15px] font-bold text-danger",
          "transition-transform duration-150 active:scale-[0.98]",
          className,
        )}
      >
        <Trash2 className="size-[18px]" strokeWidth={2} aria-hidden />
        {t.objects.detail.delete}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.objects.detail.deleteConfirmTitle}</DialogTitle>
            <DialogDescription>{t.objects.detail.deleteConfirmBody}</DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-12 items-center justify-center rounded-[14px] border border-border text-[15px] font-bold text-text transition-transform duration-150 active:scale-[0.98]"
            >
              {t.common.cancel}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
              className="flex h-12 items-center justify-center rounded-[14px] bg-danger text-[15px] font-bold text-white transition-transform duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
            >
              {t.objects.detail.deleteConfirmAction}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
