"use client";

import { useState, useTransition } from "react";
import { Archive, ArchiveRestore, Plus } from "lucide-react";
import { toast } from "sonner";

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
import {
  archiveWorkCategory,
  createWorkCategory,
  restoreWorkCategory,
} from "@/modules/reports/actions";
import type { WorkCategory } from "@/modules/reports/types";
import { cn } from "@/lib/utils";

interface WorkCategoriesManagerProps {
  companyId: string;
  initialCategories: readonly WorkCategory[];
}

const inputClassName = cn(
  "h-11 w-full rounded-[12px] border border-border bg-surface-2 px-3",
  "text-[14px] font-bold text-text placeholder:text-text-dim outline-none transition-colors",
  "focus-visible:border-brand",
  "disabled:opacity-60",
);

/**
 * Категорії робіт компанії (`work_categories`) — розділ «Налаштування»
 * адмінки. Створення, архівація й відновлення в одному компоненті:
 * список невеликий (одиниці-десятки записів), окремий екран під нього
 * було б зайвим. Без drag&drop сортування — нові категорії йдуть у кінець.
 */
export function WorkCategoriesManager({ companyId, initialCategories }: WorkCategoriesManagerProps) {
  const [categories, setCategories] = useState<readonly WorkCategory[]>(initialCategories);
  const [name, setName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, startAdding] = useTransition();

  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());
  const [confirmTarget, setConfirmTarget] = useState<WorkCategory | null>(null);
  const [isArchiving, startArchiving] = useTransition();

  const markPending = (id: string, pending: boolean) => {
    setPendingIds((current) => {
      const next = new Set(current);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleAdd = () => {
    const label = name.trim();

    if (label === "") {
      setAddError(t.admin.settings.categoriesNameRequired);
      return;
    }

    setAddError(null);

    startAdding(async () => {
      const result = await createWorkCategory(label);

      if (result.error) {
        setAddError(result.error);
        toast(result.error);
        return;
      }

      const nextSortOrder =
        categories.reduce((max, item) => Math.max(max, item.sort_order), -1) + 1;

      setCategories((current) => [
        ...current,
        {
          id: result.id ?? label,
          company_id: companyId,
          label,
          sort_order: nextSortOrder,
          archived_at: null,
        },
      ]);
      setName("");
    });
  };

  const handleConfirmArchive = () => {
    const target = confirmTarget;
    if (!target) return;

    markPending(target.id, true);

    startArchiving(async () => {
      const result = await archiveWorkCategory(target.id);
      markPending(target.id, false);

      if (result.error) {
        toast(result.error);
        return;
      }

      setCategories((current) =>
        current.map((item) =>
          item.id === target.id ? { ...item, archived_at: new Date().toISOString() } : item,
        ),
      );
      setConfirmTarget(null);
    });
  };

  const handleRestore = (category: WorkCategory) => {
    markPending(category.id, true);

    startArchiving(async () => {
      const result = await restoreWorkCategory(category.id);
      markPending(category.id, false);

      if (result.error) {
        toast(result.error);
        return;
      }

      setCategories((current) =>
        current.map((item) => (item.id === category.id ? { ...item, archived_at: null } : item)),
      );
    });
  };

  return (
    <div className="rounded-[16px] border border-border bg-surface p-4">
      <p className="text-[16px] font-bold text-text">{t.admin.settings.categoriesTitle}</p>
      <p className="mt-1 text-[13px] font-medium text-text-muted">
        {t.admin.settings.categoriesDescription}
      </p>

      <div className="mt-3 flex items-center gap-2">
        <input
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setAddError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleAdd();
          }}
          placeholder={t.admin.settings.categoriesAddPlaceholder}
          disabled={isAdding}
          aria-invalid={addError !== null}
          className={cn(inputClassName, addError && "border-danger")}
        />

        <button
          type="button"
          onClick={handleAdd}
          disabled={isAdding || name.trim() === ""}
          className={cn(
            "flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-[12px] bg-brand px-3.5",
            "text-[14px] font-bold text-brand-ink",
            "transition-transform duration-150 hover:brightness-110 active:scale-[0.97]",
            "disabled:pointer-events-none disabled:opacity-60",
          )}
        >
          <Plus className="size-4" strokeWidth={2.5} aria-hidden />
          {t.admin.settings.categoriesAdd}
        </button>
      </div>

      {addError && <p className="mt-2 text-[12px] font-semibold text-danger">{addError}</p>}

      {categories.length === 0 ? (
        <p className="mt-4 text-[13px] font-medium text-text-muted">
          {t.admin.settings.categoriesEmpty}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {categories.map((category) => {
            const isArchived = category.archived_at !== null;
            const isRowPending = pendingIds.has(category.id);

            return (
              <li
                key={category.id}
                className="flex items-center justify-between gap-3 rounded-[12px] border border-border bg-surface-2 px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-[14px] font-bold text-text">
                    {category.label}
                  </span>
                  {isArchived && (
                    <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[11px] font-bold text-text-dim">
                      {t.admin.settings.categoriesArchivedBadge}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    isArchived ? handleRestore(category) : setConfirmTarget(category)
                  }
                  disabled={isRowPending}
                  className={cn(
                    "flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] border border-border px-2.5",
                    "text-[13px] font-bold text-text",
                    "transition-transform duration-150 hover:bg-surface active:scale-[0.97]",
                    "disabled:pointer-events-none disabled:opacity-60",
                  )}
                >
                  {isArchived ? (
                    <ArchiveRestore className="size-4" strokeWidth={2} aria-hidden />
                  ) : (
                    <Archive className="size-4" strokeWidth={2} aria-hidden />
                  )}
                  {isArchived
                    ? t.admin.settings.categoriesRestore
                    : t.admin.settings.categoriesArchive}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={confirmTarget !== null} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.admin.settings.categoriesArchiveConfirmTitle}</DialogTitle>
            <DialogDescription>
              {confirmTarget
                ? fmt(t.admin.settings.categoriesArchiveConfirmBody, { name: confirmTarget.label })
                : ""}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirmTarget(null)}
              className="flex h-12 items-center justify-center rounded-[14px] border border-border text-[15px] font-bold text-text transition-transform duration-150 active:scale-[0.98]"
            >
              {t.common.cancel}
            </button>
            <button
              type="button"
              onClick={handleConfirmArchive}
              disabled={isArchiving}
              className="flex h-12 items-center justify-center rounded-[14px] bg-danger text-[15px] font-bold text-white transition-transform duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
            >
              {t.admin.settings.categoriesArchiveConfirmAction}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
