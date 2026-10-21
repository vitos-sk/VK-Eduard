"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { deleteChecklist } from "@/modules/checklists/actions";

interface DeleteChecklistButtonProps {
  checklistId: string;
  /** `icon` — квадрат с корзиной (строка списка), `text` — кнопка с подписью (экран чеклиста и форма). */
  display?: "icon" | "text";
  /** Подпись кнопки (`text`) и названия кнопки для экранных дикторов (`icon`); по умолчанию «Видалити». */
  label?: string;
  /** Тексты окна подтверждения; по умолчанию — про удаление чеклиста. */
  texts?: { title: string; body: string; confirm: string; keep: string };
  /** Вызывается перед удалением (форма останавливает автосохранение, чтобы оно не создало чеклист заново). */
  onStart?: () => Promise<void>;
  /** Удалить не вышло: форма возвращает автосохранение. */
  onFail?: () => void;
  className?: string;
}

/**
 * Красная кнопка «Видалити» чеклист с подтверждением. Успех: сервер сам переводит на «Чеклисти»
 * (`deleteChecklist` делает redirect), сюда управление возвращается только при ошибке.
 * В строке списка нажатие не должно открывать сам чеклист, поэтому ссылку-родителя гасим.
 */
export function DeleteChecklistButton({
  checklistId,
  display = "text",
  label,
  texts,
  onStart,
  onFail,
  className,
}: DeleteChecklistButtonProps) {
  const t = useT();
  const v = t.checklists.view;
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const title = label ?? v.delete;

  function handleConfirm() {
    startTransition(async () => {
      await onStart?.();
      const result = await deleteChecklist(checklistId);

      onFail?.();
      if (result?.error) toast(result.error);
    });
  }

  return (
    <>
      {display === "icon" ? (
        <Button
          variant="danger"
          size="icon-sm"
          className={cn("shrink-0", className)}
          aria-label={title}
          title={title}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setOpen(true);
          }}
        >
          <Trash2 className="size-[18px]" strokeWidth={1.9} aria-hidden />
        </Button>
      ) : (
        <Button variant="danger" size="sm" className={className} onClick={() => setOpen(true)}>
          <Trash2 className="size-4" strokeWidth={1.9} aria-hidden />
          {title}
        </Button>
      )}

      <Modal open={open} onOpenChange={setOpen}>
        <ModalContent onClick={(event) => event.stopPropagation()}>
          <ModalHeader>
            <ModalTitle>{texts?.title ?? v.deleteTitle}</ModalTitle>
            <ModalDescription>{texts?.body ?? v.deleteBody}</ModalDescription>
          </ModalHeader>

          <ModalFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              {texts?.keep ?? t.common.cancel}
            </Button>
            <Button variant="danger" onClick={handleConfirm} loading={isPending}>
              {texts?.confirm ?? v.deleteConfirm}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
