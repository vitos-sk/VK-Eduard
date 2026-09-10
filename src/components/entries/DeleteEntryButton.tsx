"use client";

import { useState, useTransition } from "react";
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
import { deleteEntry } from "@/modules/entries/actions";
import { cn } from "@/lib/utils";

interface DeleteEntryButtonProps {
  entryId: string;
  /** Вызывается после успешного удаления — навигация или перезапрос данных решает вызывающий. */
  onDeleted: () => void;
  /** Компактный вид — только иконка, без подписи; для рядка таблиці. */
  iconOnly?: boolean;
  className?: string;
}

/**
 * Кнопка видалення запису з підтвердженням — переиспользуется на детальній
 * сторінці `/reports/[id]` і в рядках «Зміни за місяць». Сам виклик
 * `deleteEntry` покладається на RLS (`entries_delete`, міграція 0005):
 * якщо вікно правки закрилось, сервер поверне зрозумілий текст помилки.
 */
export function DeleteEntryButton({
  entryId,
  onDeleted,
  iconOnly,
  className,
}: DeleteEntryButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await deleteEntry(entryId);

      if (result.error) {
        toast(result.error);
        return;
      }

      setOpen(false);
      toast(t.hours.entryDeleted);
      onDeleted();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.hours.deleteEntry}
        className={cn(
          iconOnly
            ? "flex size-9 shrink-0 items-center justify-center rounded-full text-danger active:bg-surface-2"
            : cn(
                "flex h-12 w-full items-center justify-center gap-2 rounded-[14px]",
                "border border-danger/40 text-[15px] font-bold text-danger",
                "transition-transform duration-150 active:scale-[0.98]",
              ),
          className,
        )}
      >
        <Trash2 className="size-[18px]" strokeWidth={2} aria-hidden />
        {!iconOnly && t.hours.deleteEntry}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.hours.deleteConfirmTitle}</DialogTitle>
            <DialogDescription>{t.hours.deleteConfirmBody}</DialogDescription>
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
              {t.hours.deleteConfirmAction}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
