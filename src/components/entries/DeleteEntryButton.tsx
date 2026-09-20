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
import { deleteEntry } from "@/modules/entries/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
      <Button
        variant={iconOnly ? "ghost" : "danger-outline"}
        size={iconOnly ? "icon-sm" : "lg"}
        block={!iconOnly}
        onClick={() => setOpen(true)}
        aria-label={t.hours.deleteEntry}
        className={cn(iconOnly && "text-danger-fg", className)}
      >
        <Trash2 className="size-[18px]" strokeWidth={2} aria-hidden />
        {!iconOnly && t.hours.deleteEntry}
      </Button>

      <Modal open={open} onOpenChange={setOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>{t.hours.deleteConfirmTitle}</ModalTitle>
            <ModalDescription>{t.hours.deleteConfirmBody}</ModalDescription>
          </ModalHeader>

          <ModalFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="danger" onClick={handleConfirm} disabled={isPending}>
              {t.hours.deleteConfirmAction}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
