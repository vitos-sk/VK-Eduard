"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fmt } from "@/lib/format";
import { t } from "@/lib/i18n";
import { objectsStrings as s } from "@/lib/i18n/parts/objects";
import { cn } from "@/lib/utils";
import { deleteSite, setSiteArchived } from "@/modules/sites/actions";
import { Button } from "@/components/ui/button";

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
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={s.menu.open}
            disabled={isArchivePending}
            className={cn("text-text-muted", className)}
          >
            <MoreVertical className="size-[18px]" strokeWidth={2} aria-hidden />
          </Button>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-52 !bg-surface !text-text !ring-border">
          <Button asChild variant="ghost" size="sm" block className="justify-start rounded-sm px-2">
            <Link href={`/objects/${siteId}/edit`} onClick={() => setMenuOpen(false)}>
              <Pencil className="size-[16px] text-text-muted" strokeWidth={2} aria-hidden />
              {s.menu.edit}
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            block
            className="justify-start rounded-sm px-2"
            onClick={handleArchiveToggle}
          >
            {isArchived ? (
              <ArchiveRestore className="size-[16px] text-text-muted" strokeWidth={2} aria-hidden />
            ) : (
              <Archive className="size-[16px] text-text-muted" strokeWidth={2} aria-hidden />
            )}
            {isArchived ? s.menu.restore : s.menu.archive}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            block
            className="justify-start rounded-sm px-2 text-danger-fg hover:bg-danger/10"
            onClick={() => {
              setMenuOpen(false);
              setDeleteOpen(true);
            }}
          >
            <Trash2 className="size-[16px]" strokeWidth={2} aria-hidden />
            {s.menu.delete}
          </Button>
        </PopoverContent>
      </Popover>

      <Modal open={deleteOpen} onOpenChange={setDeleteOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>{s.menu.deleteConfirmTitle}</ModalTitle>
            <ModalDescription>{fmt(s.menu.deleteConfirmBody, { name: siteName })}</ModalDescription>
          </ModalHeader>

          <ModalFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm} disabled={isDeletePending}>
              {s.menu.deleteConfirmAction}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
