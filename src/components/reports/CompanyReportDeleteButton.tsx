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
import { reportsStrings as s } from "@/lib/i18n/parts/reports";
import { t } from "@/lib/i18n";
import { deleteReport } from "@/modules/reports/actions";
import { cn } from "@/lib/utils";

interface CompanyReportDeleteButtonProps {
  reportId: string;
  /** Викликається після успішного видалення — прибрати рядок зі списку. */
  onDeleted: (reportId: string) => void;
  className?: string;
}

/**
 * Кнопка видалення звіту прямо зі стрічки адмінки — іконка з підтвердженням
 * через `Dialog` (не `window.confirm`). Клік по ній не має спливати на
 * `Link`-обгортку картки, тому `stopPropagation` на самій кнопці.
 */
export function CompanyReportDeleteButton({ reportId, onDeleted, className }: CompanyReportDeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await deleteReport(reportId);

      if (result.error) {
        toast(result.error);
        return;
      }

      setOpen(false);
      toast(s.feed.deleteSuccess);
      onDeleted(reportId);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        aria-label={s.feed.deleteReport}
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full text-danger",
          "transition-colors duration-150 hover:bg-surface active:bg-surface",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          className,
        )}
      >
        <Trash2 className="size-[18px]" strokeWidth={2} aria-hidden />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClick={(event) => event.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{s.feed.deleteConfirmTitle}</DialogTitle>
            <DialogDescription>{s.feed.deleteConfirmBody}</DialogDescription>
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
              {s.feed.deleteConfirmAction}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
