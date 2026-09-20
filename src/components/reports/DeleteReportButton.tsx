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
import { t } from "@/lib/i18n";
import { deleteReport } from "@/modules/reports/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface DeleteReportButtonProps {
  reportId: string;
  /** Вызывается после успешного удаления — навигация или перезапрос данных решает вызывающий. */
  onDeleted: () => void;
  /** Компактный вид — только иконка, без подписи; для рядка таблиці. */
  iconOnly?: boolean;
  className?: string;
}

/** Кнопка видалення звіту з підтвердженням — `/reports/[id]`. */
export function DeleteReportButton({ reportId, onDeleted, iconOnly, className }: DeleteReportButtonProps) {
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
      toast(t.reportDetail.entryDeleted);
      onDeleted();
    });
  };

  return (
    <>
      <Button
        variant={iconOnly ? "ghost" : "danger-outline"}
        size={iconOnly ? "icon-sm" : "lg"}
        block={!iconOnly}
        onClick={() => setOpen(true)}
        aria-label={t.reportDetail.deleteEntry}
        className={cn(iconOnly && "text-danger-fg", className)}
      >
        <Trash2 className="size-[18px]" strokeWidth={2} aria-hidden />
        {!iconOnly && t.reportDetail.deleteEntry}
      </Button>

      <Modal open={open} onOpenChange={setOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>{t.reportDetail.deleteConfirmTitle}</ModalTitle>
            <ModalDescription>{t.reportDetail.deleteConfirmBody}</ModalDescription>
          </ModalHeader>

          <ModalFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="danger" onClick={handleConfirm} disabled={isPending}>
              {t.reportDetail.deleteConfirmAction}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
