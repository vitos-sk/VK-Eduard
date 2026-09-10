"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { Camera, X } from "lucide-react";
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
import { createClient } from "@/lib/supabase/client";
import { deleteSitePhoto, uploadSitePhoto } from "@/modules/media/photos";
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
  /** Подписана ссылка на текущее фото (`site.photo_path`), если оно есть. */
  photoUrl?: string | null;
  companyId: string;
  onSaved: () => void;
}

/**
 * Модалка створення/редагування об'єкта для десктоп-адмінки — та сама
 * логіка й ті самі Server Actions, що й `components/objects/ObjectForm.tsx`
 * (повноекранна форма `/objects/new`), тільки без навігації: закривається
 * колбеком і перечитує список замість `router.push`.
 *
 * Фото можна завантажити тільки при редагуванні — завантаженню потрібен
 * `site_id` для шляху в Storage, а при створенні його ще нема.
 */
export function AdminSiteDialog({
  open,
  onOpenChange,
  site,
  photoUrl,
  companyId,
  onSaved,
}: AdminSiteDialogProps) {
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [name, setName] = useState(site?.name ?? "");
  const [kind, setKind] = useState(site?.kind ?? "");
  const [address, setAddress] = useState(site?.address ?? "");
  const [status, setStatus] = useState<WorkStatus>(site?.status ?? "not_started");
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(photoUrl ?? null);

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

  const handlePhotoSelect = async (file: File | undefined) => {
    if (!file || !site) return;

    setIsUploadingPhoto(true);

    try {
      if (site.photo_path) {
        await deleteSitePhoto(supabase, site.id, site.photo_path);
      }

      const path = await uploadSitePhoto(supabase, { companyId, siteId: site.id }, file);
      const { data } = await supabase.storage
        .from("site-photos")
        .createSignedUrl(path, 3600);

      setCurrentPhotoUrl(data?.signedUrl ?? null);
      onSaved();
    } catch {
      toast(t.admin.objects.photoUploadError);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handlePhotoRemove = async () => {
    if (!site?.photo_path) return;

    setIsUploadingPhoto(true);

    try {
      await deleteSitePhoto(supabase, site.id, site.photo_path);
      setCurrentPhotoUrl(null);
      onSaved();
    } catch {
      toast(t.admin.objects.photoUploadError);
    } finally {
      setIsUploadingPhoto(false);
    }
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
          {site && (
            <Field label={t.admin.objects.photoLabel}>
              <div className="flex items-center gap-3">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-[10px] bg-surface-2">
                  {currentPhotoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- подписанная ссылка Storage
                    <img src={currentPhotoUrl} alt="" className="size-full object-cover" />
                  )}

                  {currentPhotoUrl && (
                    <button
                      type="button"
                      onClick={handlePhotoRemove}
                      disabled={isUploadingPhoto}
                      aria-label={t.admin.objects.removePhoto}
                      className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white"
                    >
                      <X className="size-3" strokeWidth={2.5} aria-hidden />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-[8px] border border-border px-3",
                    "text-[13px] font-semibold text-text-muted hover:bg-surface-2",
                    "disabled:pointer-events-none disabled:opacity-60",
                  )}
                >
                  <Camera className="size-[14px]" strokeWidth={2} aria-hidden />
                  {isUploadingPhoto
                    ? t.admin.objects.uploading
                    : currentPhotoUrl
                      ? t.admin.objects.changePhoto
                      : t.admin.objects.addPhoto}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => {
                    void handlePhotoSelect(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </div>
            </Field>
          )}

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
