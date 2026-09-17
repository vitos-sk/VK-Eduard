"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { SiteWithStats } from "@/components/more/admin/sites/AdminSitesScreen";
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
 * Швидкі дії в рядку таблиці/картці: архів/розархівація одразу по кліку
 * (оборотна дія), видалення — тільки через модалку підтвердження, бо
 * `window.confirm` у проєкті заборонений. Після успіху — `router.refresh()`:
 * серверна `AdminSitesPage` перезапитує `getAllSites`, список оновлюється
 * сам через пропси (`AdminSitesScreen` їх не копіює в локальний стан).
 */
export function SiteRowActions({ site }: SiteRowActionsProps) {
  const router = useRouter();
  const [isArchivePending, startArchiveTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isArchived = site.archived_at !== null;

  const handleArchiveToggle = () => {
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
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={handleArchiveToggle}
        disabled={isArchivePending}
        aria-label={isArchived ? t.admin.sites.restore : t.admin.sites.archive}
        title={isArchived ? t.admin.sites.restore : t.admin.sites.archive}
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full text-text-muted",
          "transition-colors duration-150 hover:bg-surface-2 hover:text-text active:bg-surface-2",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          "disabled:pointer-events-none disabled:opacity-50",
        )}
      >
        {isArchived ? (
          <ArchiveRestore className="size-[17px]" strokeWidth={2} aria-hidden />
        ) : (
          <Archive className="size-[17px]" strokeWidth={2} aria-hidden />
        )}
      </button>

      <button
        type="button"
        onClick={() => setDeleteOpen(true)}
        aria-label={t.admin.sites.delete}
        title={t.admin.sites.delete}
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full text-danger",
          "transition-colors duration-150 hover:bg-danger/10 active:bg-danger/10",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        )}
      >
        <Trash2 className="size-[17px]" strokeWidth={2} aria-hidden />
      </button>

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
    </div>
  );
}
