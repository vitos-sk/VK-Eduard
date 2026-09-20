"use client";

import { useState, useTransition } from "react";
import { Archive, ArchiveRestore, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { fmt } from "@/lib/format";
import { t } from "@/lib/i18n";
import { companyStrings as s } from "@/lib/i18n/parts/company";
import {
  archiveWorkCategory,
  createWorkCategory,
  restoreWorkCategory,
} from "@/modules/reports/actions";
import type { WorkCategory } from "@/modules/reports/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface WorkCategoriesManagerProps {
  companyId: string;
  initialCategories: readonly WorkCategory[];
}

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
      setAddError(s.settings.categoriesNameRequired);
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
    <Card>
      <p className="text-[16px] font-bold text-text">{s.settings.categoriesTitle}</p>
      <p className="mt-1 text-[13px] font-medium text-text-muted">
        {s.settings.categoriesDescription}
      </p>

      <div className="mt-3 flex items-center gap-2">
        <Input size="sm"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setAddError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleAdd();
          }}
          placeholder={s.settings.categoriesAddPlaceholder}
          disabled={isAdding}
          aria-invalid={addError !== null}
                  />

        <Button size="md" onClick={handleAdd} disabled={isAdding || name.trim() === ""}>
          <Plus className="size-4" strokeWidth={2.5} aria-hidden />
          {s.settings.categoriesAdd}
        </Button>
      </div>

      {addError && <p className="mt-2 text-[12px] font-semibold text-danger-fg">{addError}</p>}

      {categories.length === 0 ? (
        <p className="mt-4 text-[13px] font-medium text-text-muted">
          {s.settings.categoriesEmpty}
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
                      {s.settings.categoriesArchivedBadge}
                    </span>
                  )}
                </div>

                <Button variant="outline" size="sm" onClick={() => isArchived ? handleRestore(category) : setConfirmTarget(category) } disabled={isRowPending}>
                  {isArchived ? (
                    <ArchiveRestore className="size-4" strokeWidth={2} aria-hidden />
                  ) : (
                    <Archive className="size-4" strokeWidth={2} aria-hidden />
                  )}
                  {isArchived
                    ? s.settings.categoriesRestore
                    : s.settings.categoriesArchive}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={confirmTarget !== null} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>{s.settings.categoriesArchiveConfirmTitle}</ModalTitle>
            <ModalDescription>
              {confirmTarget
                ? fmt(s.settings.categoriesArchiveConfirmBody, { name: confirmTarget.label })
                : ""}
            </ModalDescription>
          </ModalHeader>

          <ModalFooter>
            <Button variant="outline" onClick={() => setConfirmTarget(null)}>
              {t.common.cancel}
            </Button>
            <Button variant="danger" onClick={handleConfirmArchive} disabled={isArchiving}>
              {s.settings.categoriesArchiveConfirmAction}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Card>
  );
}
