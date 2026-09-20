"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { reportsStrings as s } from "@/lib/i18n/parts/reports";
import { t } from "@/lib/i18n";
import { deleteReport } from "@/modules/reports/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface CompanyReportDeleteButtonProps {
  reportId: string;
  /** Викликається після успішного видалення — прибрати рядок зі списку. */
  onDeleted: (reportId: string) => void;
  className?: string;
}

/**
 * Кнопка видалення звіту прямо зі стрічки адмінки — іконка з підтвердженням
 * через `Modal` (не `window.confirm`). Клік по ній не має спливати на
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
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        aria-label={s.feed.deleteReport}
        className={cn("text-danger-fg", className)}
      >
        <Trash2 className="size-[18px]" strokeWidth={2} aria-hidden />
      </Button>

      <Modal open={open} onOpenChange={setOpen}>
        <ModalContent onClick={(event) => event.stopPropagation()}>
          <ModalHeader>
            <ModalTitle>{s.feed.deleteConfirmTitle}</ModalTitle>
            <ModalDescription>{s.feed.deleteConfirmBody}</ModalDescription>
          </ModalHeader>

          <ModalFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="danger" onClick={handleConfirm} disabled={isPending}>
              {s.feed.deleteConfirmAction}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
