"use client";

import { useState, useTransition } from "react";
import { UserX } from "lucide-react";
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
import { setWorkerActive } from "@/modules/team/actions";
import { cn } from "@/lib/utils";

interface DeactivateWorkerButtonProps {
  workerId: string;
  /** Викликається після успішної деактивації — повернення до списку і перезапит вирішує викликач. */
  onDeactivated: () => void;
  className?: string;
}

/**
 * Кнопка деактивації співробітника з підтвердженням — тільки boss, на
 * вкладці «Команда». Не видаляє профіль (FK на `work_entries.author_id`
 * цього не дозволив би), лише ховає доступ і зникає зі списку.
 */
export function DeactivateWorkerButton({
  workerId,
  onDeactivated,
  className,
}: DeactivateWorkerButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await setWorkerActive(workerId, false);

      if (result.error) {
        toast(result.error);
        return;
      }

      setOpen(false);
      onDeactivated();
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
        <UserX className="size-[18px]" strokeWidth={2} aria-hidden />
        {t.reports.team.deactivate}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.reports.team.deactivateConfirmTitle}</DialogTitle>
            <DialogDescription>{t.reports.team.deactivateConfirmBody}</DialogDescription>
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
              {t.reports.team.deactivateConfirmAction}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
