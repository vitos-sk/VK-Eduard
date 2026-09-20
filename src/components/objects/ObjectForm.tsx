"use client";

import { useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { BackHeader } from "@/components/layout/ScreenHeader";
import { SitePhotoUploader } from "@/components/objects/SitePhotoUploader";
import {
  SegmentedTabs,
  type SegmentedOption,
} from "@/components/shared/SegmentedTabs";
import { t } from "@/lib/i18n";
import type { WorkStatus } from "@/lib/types";
import { createSite, updateSite } from "@/modules/sites/actions";
import type { Site } from "@/modules/sites/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STATUS_OPTIONS: readonly SegmentedOption<WorkStatus>[] = [
  { value: "not_started", label: t.status.not_started },
  { value: "in_progress", label: t.status.in_progress },
  { value: "paused", label: t.status.paused },
  { value: "completed", label: t.status.completed },
];

interface ObjectFormProps {
  /** Не задан — форма створення, задан — редагування цього об'єкта. */
  site?: Site;
  companyId: string;
  /** Підписане посилання на поточне фото об'єкта (якщо є). */
  photoUrl?: string | null;
}

/** Форма `/objects/new` і `/objects/[id]/edit` — доступна тільки boss (RLS). */
export function ObjectForm({ site, companyId, photoUrl = null }: ObjectFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(site?.name ?? "");
  const [kind, setKind] = useState(site?.kind ?? "");
  const [address, setAddress] = useState(site?.address ?? "");
  const [status, setStatus] = useState<WorkStatus>(site?.status ?? "not_started");
  // Щойно створений об'єкт (тільки в режимі створення) — форма підмінюється
  // кроком «додайте фото», бо `SitePhotoUploader` вимагає реальний `siteId`,
  // якого до збереження ще нема.
  const [createdSiteId, setCreatedSiteId] = useState<string | null>(null);

  const isValid = name.trim() !== "";

  const handleSave = () => {
    startTransition(async () => {
      const input = { name, kind, address, status };

      if (site) {
        const result = await updateSite(site.id, input);

        if (result.error) {
          toast(result.error);
          return;
        }

        router.push(`/objects/${site.id}`);
        return;
      }

      const result = await createSite(input);

      if (result.error) {
        toast(result.error);
        return;
      }

      setCreatedSiteId(result.id ?? null);
    });
  };

  if (createdSiteId) {
    return (
      <div className="pb-6">
        <BackHeader title={t.objects.form.createTitle} onBack={() => router.push(`/objects/${createdSiteId}`)} />

        <div className="flex flex-col gap-4 px-4 lg:mx-auto lg:max-w-[640px]">
          <div>
            <p className="text-[17px] font-bold">{t.objects.form.createdTitle}</p>
            <p className="mt-1 text-[14px] font-medium text-text-muted">{t.objects.form.createdHint}</p>
          </div>

          <SitePhotoUploader companyId={companyId} siteId={createdSiteId} photoPath={null} photoUrl={null} />

          <Button size="xl" block className="mt-2" onClick={() => router.push(`/objects/${createdSiteId}`)}>
            {t.objects.form.done}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <BackHeader
        title={site ? t.objects.form.editTitle : t.objects.form.createTitle}
        onBack={() => router.back()}
      />

      <div className="flex flex-col gap-4 px-4 lg:mx-auto lg:max-w-[640px]">
        {site && (
          <SitePhotoUploader
            companyId={companyId}
            siteId={site.id}
            photoPath={site.photo_path}
            photoUrl={photoUrl}
          />
        )}

        <Field label={t.objects.form.nameLabel}>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t.objects.form.namePlaceholder}
            aria-invalid={!isValid}
                      />
        </Field>

        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-4">
          <Field label={t.objects.form.kindLabel}>
            <Input
              value={kind}
              onChange={(event) => setKind(event.target.value)}
              placeholder={t.objects.form.kindPlaceholder}
                          />
          </Field>

          <Field label={t.objects.form.addressLabel}>
            <Input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder={t.objects.form.addressPlaceholder}
                          />
          </Field>
        </div>

        <Field label={t.objects.form.statusLabel}>
          <SegmentedTabs
            options={STATUS_OPTIONS}
            value={status}
            onChange={setStatus}
            label={t.objects.form.statusLabel}
          />
        </Field>

        <Button size="xl" block className="mt-2" onClick={handleSave} disabled={!isValid || isPending}>
          {t.objects.form.save}
        </Button>
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
