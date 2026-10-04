"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { FormTopBar, StickyActionBar } from "@/components/shared/FormParts";
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
import { Ticket, TicketSection } from "@/components/ui/ticket";
import { UnderlineField } from "@/components/ui/underline-field";

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
      <div className="pb-2 lg:mx-auto lg:max-w-[640px]">
        <FormTopBar
          title={t.objects.form.createdTitle}
          onBack={() => router.push(`/objects/${createdSiteId}`)}
        >
          <p className="mt-0.5 text-[13px] text-ink-2">{t.objects.form.createdHint}</p>
        </FormTopBar>

        <div className="mt-4 px-4 lg:px-0">
          <Ticket variant="flat">
            <SitePhotoUploader companyId={companyId} siteId={createdSiteId} photoPath={null} photoUrl={null} />
          </Ticket>
        </div>

        <StickyActionBar>
          <Button block onClick={() => router.push(`/objects/${createdSiteId}`)}>
            {t.objects.form.done}
          </Button>
        </StickyActionBar>
      </div>
    );
  }

  return (
    <div className="pb-2 lg:mx-auto lg:max-w-[640px]">
      <FormTopBar
        title={site ? t.objects.form.editTitle : t.objects.form.createTitle}
        onBack={() => router.back()}
      />

      <div className="mt-3 space-y-3.5 px-4 lg:px-0">
        {site && (
          <Ticket variant="flat">
            <SitePhotoUploader
              companyId={companyId}
              siteId={site.id}
              photoPath={site.photo_path}
              photoUrl={photoUrl}
            />
          </Ticket>
        )}

        <Ticket variant="sections">
          <TicketSection>
            <UnderlineField
              label={t.objects.form.nameLabel}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t.objects.form.namePlaceholder}
            />
          </TicketSection>
          <TicketSection>
            <UnderlineField
              label={t.objects.form.kindLabel}
              value={kind}
              onChange={(event) => setKind(event.target.value)}
              placeholder={t.objects.form.kindPlaceholder}
            />
          </TicketSection>
          <TicketSection>
            <UnderlineField
              label={t.objects.form.addressLabel}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder={t.objects.form.addressPlaceholder}
            />
          </TicketSection>
          <TicketSection>
            <p className="text-[12px] text-ink-2">{t.objects.form.statusLabel}</p>
            <SegmentedTabs
              variant="chips"
              options={STATUS_OPTIONS}
              value={status}
              onChange={setStatus}
              label={t.objects.form.statusLabel}
              className="px-0 mx-0 flex-wrap overflow-visible"
            />
          </TicketSection>
        </Ticket>
      </div>

      <StickyActionBar>
        <Button block onClick={handleSave} disabled={!isValid} loading={isPending}>
          {isValid ? t.objects.form.save : t.objects.form.nameRequired}
        </Button>
      </StickyActionBar>
    </div>
  );
}
