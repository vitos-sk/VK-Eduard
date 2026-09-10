"use client";

import { useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { BackHeader } from "@/components/layout/ScreenHeader";
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
  "h-[52px] w-full rounded-[14px] border border-border bg-surface px-3",
  "text-[15px] font-bold text-text placeholder:text-text-dim outline-none",
  "focus-visible:border-brand",
);

interface ObjectFormProps {
  /** Не задан — форма створення, задан — редагування цього об'єкта. */
  site?: Site;
}

/** Форма `/objects/new` і `/objects/[id]/edit` — доступна тільки boss (RLS). */
export function ObjectForm({ site }: ObjectFormProps) {
  const router = useRouter();
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

      router.push(site ? `/objects/${site.id}` : `/objects/${"id" in result ? result.id : ""}`);
    });
  };

  return (
    <div className="pb-6">
      <BackHeader
        title={site ? t.objects.form.editTitle : t.objects.form.createTitle}
        onBack={() => router.back()}
      />

      <div className="flex flex-col gap-4 px-4">
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
            "mt-2 flex h-[56px] w-full items-center justify-center rounded-[14px]",
            "bg-brand text-[15px] font-bold text-brand-ink",
            "transition-transform duration-150 active:scale-[0.98]",
            "disabled:pointer-events-none disabled:opacity-60",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          )}
        >
          {t.objects.form.save}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-semibold text-text-muted">{label}</p>
      {children}
    </div>
  );
}
