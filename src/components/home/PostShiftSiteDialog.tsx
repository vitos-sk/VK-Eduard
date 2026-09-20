"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, PenLine } from "lucide-react";
import { toast } from "sonner";

import { ObjectPickerDrawer } from "@/components/time/ObjectPickerDrawer";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { t } from "@/lib/i18n";
import { setEntrySite, updateEntryDescription } from "@/modules/entries/actions";
import type { Site } from "@/modules/sites/queries";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

interface PostShiftSiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Запис щойно завершеної зміни — саме йому дописуємо об'єкт/опис. */
  entryId: string;
  sites: readonly Site[];
}

/**
 * Модалка після «Завершити роботу», коли зміну почали без вибору об'єкта
 * (`WorkTimeCard`). Два шляхи дозаповнити, де саме працювали: обрати зі
 * списку об'єктів компанії (`ObjectPickerDrawer`, той самий, що й у
 * `ManualTimeScreen`) або написати вручну в опис запису — та сама розвилка
 * «об'єкт або опис», що вже діє у формі ручного вводу часу.
 */
export function PostShiftSiteDialog({
  open,
  onOpenChange,
  entryId,
  sites,
}: PostShiftSiteDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [description, setDescription] = useState("");

  const close = () => {
    onOpenChange(false);
    setIsWriting(false);
    setDescription("");
  };

  const handleSiteSelect = (siteId: string) => {
    startTransition(async () => {
      const result = await setEntrySite(entryId, siteId);

      if (result.error) {
        toast(result.error);
        return;
      }

      toast(t.home.postShift.saved);
      router.refresh();
      close();
    });
  };

  const handleDescriptionSave = () => {
    if (description.trim() === "") return;

    startTransition(async () => {
      const result = await updateEntryDescription(entryId, description.trim());

      if (result.error) {
        toast(result.error);
        return;
      }

      toast(t.home.postShift.saved);
      router.refresh();
      close();
    });
  };

  return (
    <>
      <Modal open={open && !isPickerOpen} onOpenChange={(next) => !next && close()}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>{t.home.postShift.title}</ModalTitle>
            <ModalDescription>{t.home.postShift.body}</ModalDescription>
          </ModalHeader>

          {isWriting ? (
            <div className="flex flex-col gap-3">
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                autoFocus
                placeholder={t.home.postShift.placeholder}
              />

              <ModalFooter>
                <Button variant="outline" onClick={close}>
                  {t.home.postShift.skip}
                </Button>
                <Button onClick={handleDescriptionSave} disabled={isPending || description.trim() === ""}>
                  {t.home.postShift.save}
                </Button>
              </ModalFooter>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Button variant="secondary" className="gap-3" onClick={() => setIsPickerOpen(true)}>
                <Building2 className="size-5 shrink-0 text-primary" strokeWidth={2} aria-hidden />
                {t.home.postShift.pickAction}
              </Button>

              <Button variant="secondary" className="gap-3" onClick={() => setIsWriting(true)}>
                <PenLine className="size-5 shrink-0 text-primary" strokeWidth={2} aria-hidden />
                {t.home.postShift.writeAction}
              </Button>

              <Button variant="ghost" size="sm" className="mt-1 text-text-muted" onClick={close}>
                {t.home.postShift.skip}
              </Button>
            </div>
          )}
        </ModalContent>
      </Modal>

      <ObjectPickerDrawer
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        sites={sites}
        value={null}
        onSelect={handleSiteSelect}
      />
    </>
  );
}
