"use client";

import { useRef, useState, useTransition } from "react";
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
import { useT } from "@/lib/i18n/client";
import { deleteEntry, findReportToOffer } from "@/modules/entries/actions";
import { deleteReport } from "@/modules/reports/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** Что удалено: `reportDeleted` — вместе со временем убрали и отчёт (страница отчёта тогда закрывается). */
export interface DeleteOutcome {
  reportDeleted: boolean;
}

interface DeleteEntryButtonProps {
  entryId: string;
  /** Вызывается после успешного удаления — навигация или перезапрос данных решает вызывающий. */
  onDeleted: (outcome?: DeleteOutcome) => void;
  /**
   * Запись рабочего времени: если это последнее время за день и на день есть отчёт, окно спрашивает,
   * удалять ли и отчёт. Для дороги и прочего не нужно.
   */
  askAboutReport?: boolean;
  /** Компактный вид — только иконка, без подписи; для рядка таблиці. */
  iconOnly?: boolean;
  /** Низкая кнопка с короткой подписью «Видалити» — для розкритого рядка зміни на телефоні. */
  compact?: boolean;
  className?: string;
  /** Что вызвать для удаления; по умолчанию — запись рабочего времени. */
  remove?: (id: string) => Promise<{ error: string | null }>;
  /** Тексты подтверждения; по умолчанию — для записи рабочего времени. */
  texts?: { title: string; body: string; deleted: string };
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
  compact,
  className,
  remove = deleteEntry,
  texts,
  askAboutReport = false,
}: DeleteEntryButtonProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  // Отчёт, который предлагаем удалить вместе со временем (`null` — спрашивать не о чем), и идёт ли проверка.
  const [offer, setOffer] = useState<{ checking: boolean; reportId: string | null; othersRemain: boolean }>({
    checking: false,
    reportId: null,
    othersRemain: false,
  });
  const lastCheck = useRef(0);

  const handleOpen = () => {
    setOpen(true);

    if (!askAboutReport) return;

    // Поздний ответ от прошлого открытия окна не должен подменить свежий.
    const check = ++lastCheck.current;
    setOffer({ checking: true, reportId: null, othersRemain: false });

    findReportToOffer(entryId)
      .then(
        (result) =>
          check === lastCheck.current &&
          setOffer({ checking: false, reportId: result.reportId, othersRemain: result.othersRemain }),
      )
      .catch(() => check === lastCheck.current && setOffer({ checking: false, reportId: null, othersRemain: false }));
  };

  // Время и вместе с ним отчёт (а с отчётом уходят и дорога за этот день).
  const handleConfirmWithReport = () => {
    const reportId = offer.reportId;
    if (!reportId) return;

    startTransition(async () => {
      const result = await deleteReport(reportId);

      if (result.error) {
        toast(result.error);
        return;
      }

      setOpen(false);
      toast(result.warning ?? t.hours.entryAndReportDeleted);
      onDeleted({ reportDeleted: true });
    });
  };

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await remove(entryId);

      if (result.error) {
        toast(result.error);
        return;
      }

      setOpen(false);
      toast(texts?.deleted ?? t.hours.entryDeleted);
      onDeleted({ reportDeleted: false });
    });
  };

  return (
    <>
      <Button
        variant={iconOnly ? "ghost" : "danger"}
        size={iconOnly ? "icon-sm" : compact ? "sm" : "lg"}
        block={!iconOnly}
        onClick={handleOpen}
        aria-label={t.hours.deleteEntry}
        className={cn(iconOnly && "text-danger-fg", className)}
      >
        <Trash2 className={compact ? "size-4" : "size-[18px]"} strokeWidth={1.9} aria-hidden />
        {!iconOnly && (compact ? t.hoursUi.deleteShort : t.hours.deleteEntry)}
      </Button>

      <Modal open={open} onOpenChange={setOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>{texts?.title ?? t.hours.deleteConfirmTitle}</ModalTitle>
            <ModalDescription>
              {offer.reportId
                ? offer.othersRemain
                  ? t.hours.deleteDayBody
                  : t.hours.deleteTimeAndReportBody
                : (texts?.body ?? t.hours.deleteConfirmBody)}
            </ModalDescription>
          </ModalHeader>

          <ModalFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            {offer.reportId ? (
              <>
                <Button variant="outline" onClick={handleConfirm} disabled={isPending}>
                  {offer.othersRemain ? t.hours.deleteThisTimeOnly : t.hours.deleteTimeOnly}
                </Button>
                <Button variant="danger" onClick={handleConfirmWithReport} disabled={isPending}>
                  {offer.othersRemain ? t.hours.deleteWholeDay : t.hours.deleteTimeAndReport}
                </Button>
              </>
            ) : (
              <Button variant="danger" onClick={handleConfirm} disabled={isPending || offer.checking}>
                {t.hours.deleteConfirmAction}
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
