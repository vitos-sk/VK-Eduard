"use client";

import { useState, useTransition } from "react";
import { UserX } from "lucide-react";
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
import { setWorkerActive } from "@/modules/team/actions";
import { Button } from "@/components/ui/button";

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
      <Button variant="danger-outline" block onClick={() => setOpen(true)} className={className}>
        <UserX className="size-[18px]" strokeWidth={2} aria-hidden />
        {t.reports.team.deactivate}
      </Button>

      <Modal open={open} onOpenChange={setOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>{t.reports.team.deactivateConfirmTitle}</ModalTitle>
            <ModalDescription>{t.reports.team.deactivateConfirmBody}</ModalDescription>
          </ModalHeader>

          <ModalFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="danger" onClick={handleConfirm} disabled={isPending}>
              {t.reports.team.deactivateConfirmAction}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
