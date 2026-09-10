"use client";

import { useState, useTransition } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SegmentedTabs,
  type SegmentedOption,
} from "@/components/shared/SegmentedTabs";
import { t } from "@/lib/i18n";
import type { WorkStatus } from "@/lib/types";
import { createSite, updateSite } from "@/modules/sites/actions";
import type { Site } from "@/modules/sites/queries";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: readonly SegmentedOption<WorkStatus>[] = [
  { value: "not_started", label: t.status.not_started },
  { value: "in_progress", label: t.status.in_progress },
  { value: "paused", label: t.status.paused },
  { value: "completed", label: t.status.completed },
];

const inputClassName = cn(
  "h-11 w-full rounded-[10px] border border-border bg-bg px-3",
  "text-[14px] font-bold text-text placeholder:text-text-dim outline-none",
  "focus-visible:border-brand",
);

interface AdminSiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Не задан — форма створення, задан — редагування цього об'єкта. */
  site?: Site;
  onSaved: () => void;
}

/**
 * Модалка створення/редагування об'єкта для десктоп-адмінки — та сама
 * логіка й ті самі Server Actions, що й `components/objects/ObjectForm.tsx`
 * (повноекранна форма `/objects/new`), тільки без навігації: закривається
 * колбеком і перечитує список замість `router.push`.
 */
export function AdminSiteDialog({ open, onOpenChange, site, onSaved }: AdminSiteDialogProps) {
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(site?.name ?? "");
  const [kind, setKind] = useState(site?.kind ?? "");
  const [address, setAddress] = useState(site?.address ?? "");
  const [status, setStatus] = useState<WorkStatus>(site?.status ?? "not_started");

  const isValid = name.trim() !== "";

  const handleSave = () => {
    startTransition(async () => {
      const input = { name, kind, address, status };
      const result = site ? await updateSite(site.id, input) : await createSite(input);

      if (result.error) {
        toast(result.error);
        return;
      }

      onOpenChange(false);
      onSaved();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>
            {site ? t.objects.form.editTitle : t.objects.form.createTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Field label={t.objects.form.nameLabel}>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t.objects.form.namePlaceholder}
              aria-invalid={!isValid}
              className={inputClassName}
            />
          </Field>

          <Field label={t.objects.form.kindLabel}>
            <input
              value={kind}
              onChange={(event) => setKind(event.target.value)}
              placeholder={t.objects.form.kindPlaceholder}
              className={inputClassName}
            />
          </Field>

          <Field label={t.objects.form.addressLabel}>
            <input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder={t.objects.form.addressPlaceholder}
              className={inputClassName}
            />
          </Field>

          <Field label={t.objects.form.statusLabel}>
            <SegmentedTabs
              options={STATUS_OPTIONS}
              value={status}
              onChange={setStatus}
              label={t.objects.form.statusLabel}
            />
          </Field>

          <button
            type="button"
            onClick={handleSave}
            disabled={!isValid || isPending}
            className={cn(
              "mt-1 flex h-11 w-full items-center justify-center rounded-[10px]",
              "bg-brand text-[14px] font-bold text-brand-ink",
              "transition-transform duration-150 active:scale-[0.98]",
              "disabled:pointer-events-none disabled:opacity-60",
            )}
          >
            {t.objects.form.save}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[12px] font-semibold text-text-muted">{label}</p>
      {children}
    </div>
  );
}
