"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { deleteSite } from "@/modules/sites/actions";
import { Button } from "@/components/ui/button";

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
      <Button variant="danger-outline" block onClick={() => setOpen(true)} className={className}>
        <Trash2 className="size-[18px]" strokeWidth={2} aria-hidden />
        {t.objects.detail.delete}
      </Button>

      <Modal open={open} onOpenChange={setOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>{t.objects.detail.deleteConfirmTitle}</ModalTitle>
            <ModalDescription>{t.objects.detail.deleteConfirmBody}</ModalDescription>
          </ModalHeader>

          <ModalFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="danger" onClick={handleConfirm} disabled={isPending}>
              {t.objects.detail.deleteConfirmAction}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
