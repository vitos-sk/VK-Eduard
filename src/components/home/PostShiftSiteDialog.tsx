"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, PenLine } from "lucide-react";
import { toast } from "sonner";

import { ObjectPickerDrawer } from "@/components/time/ObjectPickerDrawer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { setEntrySite, updateEntryDescription } from "@/modules/entries/actions";
import type { Site } from "@/modules/sites/queries";

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
      <Dialog open={open && !isPickerOpen} onOpenChange={(next) => !next && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.home.postShift.title}</DialogTitle>
            <DialogDescription>{t.home.postShift.body}</DialogDescription>
          </DialogHeader>

          {isWriting ? (
            <div className="flex flex-col gap-3">
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                autoFocus
                placeholder={t.home.postShift.placeholder}
                className={cn(
                  "w-full resize-none rounded-[16px] border border-border bg-surface p-4",
                  "text-[15px] leading-[1.4] font-medium text-text placeholder:text-text-dim",
                  "outline-none focus-visible:border-brand",
                )}
              />

              <DialogFooter>
                <button
                  type="button"
                  onClick={close}
                  className="flex h-12 items-center justify-center rounded-[14px] border border-border text-[15px] font-bold text-text transition-transform duration-150 active:scale-[0.98]"
                >
                  {t.home.postShift.skip}
                </button>
                <button
                  type="button"
                  onClick={handleDescriptionSave}
                  disabled={isPending || description.trim() === ""}
                  className="flex h-12 items-center justify-center rounded-[14px] bg-brand text-[15px] font-bold text-brand-ink transition-transform duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
                >
                  {t.home.postShift.save}
                </button>
              </DialogFooter>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setIsPickerOpen(true)}
                className={cn(
                  "flex h-12 items-center gap-3 rounded-[14px] border border-border bg-surface-2 px-4",
                  "text-[15px] font-bold text-text",
                  "transition-transform duration-150 active:scale-[0.98]",
                )}
              >
                <Building2 className="size-5 shrink-0 text-brand" strokeWidth={2} aria-hidden />
                {t.home.postShift.pickAction}
              </button>

              <button
                type="button"
                onClick={() => setIsWriting(true)}
                className={cn(
                  "flex h-12 items-center gap-3 rounded-[14px] border border-border bg-surface-2 px-4",
                  "text-[15px] font-bold text-text",
                  "transition-transform duration-150 active:scale-[0.98]",
                )}
              >
                <PenLine className="size-5 shrink-0 text-brand" strokeWidth={2} aria-hidden />
                {t.home.postShift.writeAction}
              </button>

              <button
                type="button"
                onClick={close}
                className="mt-1 h-10 text-[13px] font-semibold text-text-muted"
              >
                {t.home.postShift.skip}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
