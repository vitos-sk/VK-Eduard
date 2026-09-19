"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fmt } from "@/lib/format";
import { t } from "@/lib/i18n";
import { objectsStrings as s } from "@/lib/i18n/parts/objects";
import { cn } from "@/lib/utils";
import { deleteSite, setSiteArchived } from "@/modules/sites/actions";

interface ObjectMenuProps {
  siteId: string;
  siteName: string;
  isArchived: boolean;
  className?: string;
}

/**
 * Меню «⋮» об'єкта для boss: редагувати / архівувати / видалити (з модалкою
 * підтвердження). Живе поруч із карточкою, а не всередині її посилання.
 */
export function ObjectMenu({ siteId, siteName, isArchived, className }: ObjectMenuProps) {
  const router = useRouter();
  const [isArchivePending, startArchiveTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleArchiveToggle = () => {
    setMenuOpen(false);
    startArchiveTransition(async () => {
      const result = await setSiteArchived(siteId, !isArchived);

      if (result.error) {
        toast(result.error);
        return;
      }

      router.refresh();
    });
  };

  const handleDeleteConfirm = () => {
    startDeleteTransition(async () => {
      const result = await deleteSite(siteId);

      if (result.error) {
        toast(result.error);
        return;
      }

      setDeleteOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={s.menu.open}
            disabled={isArchivePending}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full text-text-muted",
              "transition-colors duration-150 hover:bg-surface-2 hover:text-text active:bg-surface-2",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              "disabled:pointer-events-none disabled:opacity-50",
              className,
            )}
          >
            <MoreVertical className="size-[18px]" strokeWidth={2} aria-hidden />
          </button>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-52 !bg-surface !text-text !ring-border">
          <Link
            href={`/objects/${siteId}/edit`}
            onClick={() => setMenuOpen(false)}
            className="flex h-10 items-center gap-2 rounded-[8px] px-2 text-[14px] font-semibold hover:bg-surface-2"
          >
            <Pencil className="size-[16px] text-text-muted" strokeWidth={2} aria-hidden />
            {s.menu.edit}
          </Link>

          <button
            type="button"
            onClick={handleArchiveToggle}
            className="flex h-10 w-full items-center gap-2 rounded-[8px] px-2 text-left text-[14px] font-semibold hover:bg-surface-2"
          >
            {isArchived ? (
              <ArchiveRestore className="size-[16px] text-text-muted" strokeWidth={2} aria-hidden />
            ) : (
              <Archive className="size-[16px] text-text-muted" strokeWidth={2} aria-hidden />
            )}
            {isArchived ? s.menu.restore : s.menu.archive}
          </button>

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setDeleteOpen(true);
            }}
            className="flex h-10 w-full items-center gap-2 rounded-[8px] px-2 text-left text-[14px] font-semibold text-danger hover:bg-danger/10"
          >
            <Trash2 className="size-[16px]" strokeWidth={2} aria-hidden />
            {s.menu.delete}
          </button>
        </PopoverContent>
      </Popover>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{s.menu.deleteConfirmTitle}</DialogTitle>
            <DialogDescription>{fmt(s.menu.deleteConfirmBody, { name: siteName })}</DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setDeleteOpen(false)}
              className="flex h-12 items-center justify-center rounded-[14px] border border-border text-[15px] font-bold text-text transition-transform duration-150 active:scale-[0.98]"
            >
              {t.common.cancel}
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={isDeletePending}
              className="flex h-12 items-center justify-center rounded-[14px] bg-danger text-[15px] font-bold text-white transition-transform duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
            >
              {s.menu.deleteConfirmAction}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
