"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { SiteWithStats } from "@/components/more/admin/sites/AdminSitesScreen";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fmt } from "@/lib/format";
import { t } from "@/lib/i18n";
import { deleteSite, setSiteArchived } from "@/modules/sites/actions";
import { cn } from "@/lib/utils";

interface SiteRowActionsProps {
  site: SiteWithStats;
}

/**
 * Дії з об'єктом сховані за кнопкою «⋮» — рядок/картка веде на перегляд
 * (`/objects/[id]`, звіти й фото), а редагування/архів/видалення живуть
 * тут, щоб не плутати «подивитись» і «змінити» в одному кліку. Видалення —
 * тільки через модалку підтвердження (`window.confirm` в проєкті заборонений).
 * Після успіху — `router.refresh()`: серверна `AdminSitesPage` перезапитує
 * `getAllSites`, список оновлюється сам через пропси.
 */
export function SiteRowActions({ site }: SiteRowActionsProps) {
  const router = useRouter();
  const [isArchivePending, startArchiveTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isArchived = site.archived_at !== null;

  const handleArchiveToggle = () => {
    setMenuOpen(false);
    startArchiveTransition(async () => {
      const result = await setSiteArchived(site.id, !isArchived);

      if (result.error) {
        toast(result.error);
        return;
      }

      router.refresh();
    });
  };

  const handleDeleteConfirm = () => {
    startDeleteTransition(async () => {
      const result = await deleteSite(site.id);

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
            aria-label={t.admin.sites.openMenu}
            disabled={isArchivePending}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full text-text-muted",
              "transition-colors duration-150 hover:bg-surface-2 hover:text-text active:bg-surface-2",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              "disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            <MoreVertical className="size-[18px]" strokeWidth={2} aria-hidden />
          </button>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-52 !bg-surface !text-text !ring-border">
          <Link
            href={`/objects/${site.id}/edit`}
            onClick={() => setMenuOpen(false)}
            className="flex h-10 items-center gap-2 rounded-[8px] px-2 text-[14px] font-semibold hover:bg-surface-2"
          >
            <Pencil className="size-[16px] text-text-muted" strokeWidth={2} aria-hidden />
            {t.admin.sites.edit}
          </Link>

          <button
            type="button"
            onClick={handleArchiveToggle}
            className="flex h-10 items-center gap-2 rounded-[8px] px-2 text-left text-[14px] font-semibold hover:bg-surface-2"
          >
            {isArchived ? (
              <ArchiveRestore className="size-[16px] text-text-muted" strokeWidth={2} aria-hidden />
            ) : (
              <Archive className="size-[16px] text-text-muted" strokeWidth={2} aria-hidden />
            )}
            {isArchived ? t.admin.sites.restore : t.admin.sites.archive}
          </button>

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setDeleteOpen(true);
            }}
            className="flex h-10 items-center gap-2 rounded-[8px] px-2 text-left text-[14px] font-semibold text-danger hover:bg-danger/10"
          >
            <Trash2 className="size-[16px]" strokeWidth={2} aria-hidden />
            {t.admin.sites.delete}
          </button>
        </PopoverContent>
      </Popover>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.admin.sites.deleteConfirmTitle}</DialogTitle>
            <DialogDescription>
              {fmt(t.admin.sites.deleteConfirmBody, { name: site.name })}
            </DialogDescription>
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
              {t.admin.sites.deleteConfirmAction}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
