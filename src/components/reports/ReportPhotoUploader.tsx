"use client";

import { useMemo, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { toast } from "sonner";

import { PhotoLightbox } from "@/components/shared/PhotoLightbox";
import { fmt } from "@/lib/format";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { MAX_PHOTOS_PER_ENTRY, deleteReportPhoto, uploadReportPhoto } from "@/modules/media/photos";
import type { ReportPhoto } from "@/modules/reports/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const BUCKET = "entry-photos";

interface ReportPhotoUploaderProps {
  companyId: string;
  reportId: string;
  photos: readonly ReportPhoto[];
  /** Подписанные ссылки: `storage_path` → URL. */
  urls: Readonly<Record<string, string>>;
  onPhotosChange: (photos: ReportPhoto[]) => void;
  onUrlsChange: (patch: Record<string, string>) => void;
  /** Чужой звіт — фото можно только смотреть. */
  editable: boolean;
  className?: string;
}

/** Сетка фото звіту — те саме, що `PhotoUploader`, тільки для `report_photos`. */
export function ReportPhotoUploader({
  companyId,
  reportId,
  photos,
  urls,
  onPhotosChange,
  onUrlsChange,
  editable,
  className,
}: ReportPhotoUploaderProps) {
  const supabase = useMemo(() => createClient(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [viewedUrl, setViewedUrl] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remaining = MAX_PHOTOS_PER_ENTRY - photos.length;
    const toUpload = Array.from(files).slice(0, Math.max(0, remaining));

    if (toUpload.length === 0) return;

    setIsUploading(true);
    const nextPhotos = [...photos];
    const nextUrls: Record<string, string> = {};
    let sortOrder = photos.length;

    for (const file of toUpload) {
      try {
        const photo = await uploadReportPhoto(
          supabase,
          { companyId, reportId, sortOrder },
          file,
        );
        sortOrder += 1;
        nextPhotos.push(photo);

        const { data } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(photo.storage_path, 3600);

        if (data?.signedUrl) {
          nextUrls[photo.storage_path] = data.signedUrl;
        }
      } catch {
        toast(t.reportDetail.uploadError);
      }
    }

    onPhotosChange(nextPhotos);
    onUrlsChange(nextUrls);
    setIsUploading(false);
  };

  const handleRemove = async (photo: ReportPhoto) => {
    try {
      await deleteReportPhoto(supabase, photo);
      onPhotosChange(photos.filter((item) => item.id !== photo.id));
    } catch {
      toast(t.reportDetail.deletePhotoError);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-2">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative size-20 shrink-0 overflow-hidden rounded-[12px] bg-surface-2"
          >
            {urls[photo.storage_path] && (
              <Button
                variant="bare"
                size="bare"
                block
                onClick={() => setViewedUrl(urls[photo.storage_path])}
                aria-label={t.reportDetail.viewPhoto}
                className="size-full"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- подписанная ссылка Storage */}
                <img src={urls[photo.storage_path]} alt="" className="size-full object-cover" />
              </Button>
            )}

            {editable && (
              <Button
                variant="scrim"
                size="icon-xs"
                onClick={() => handleRemove(photo)}
                aria-label={t.reportDetail.removePhoto}
                className="absolute top-1 right-1"
              >
                <X className="size-3.5" strokeWidth={2.5} aria-hidden />
              </Button>
            )}
          </div>
        ))}

        {editable && photos.length < MAX_PHOTOS_PER_ENTRY && (
          <Button
            variant="outline"
            size="bare"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="size-20 flex-col justify-center gap-1 rounded-ctl border-dashed text-text-muted"
          >
            <Camera className="size-5" strokeWidth={2} aria-hidden />
            <span className="text-[11px] font-semibold">
              {isUploading ? t.reportDetail.uploading : t.reportDetail.addPhoto}
            </span>
          </Button>
        )}
      </div>

      {editable && (
        <p className="text-[12px] font-medium text-text-dim">
          {fmt(t.reportDetail.maxPhotos, { max: MAX_PHOTOS_PER_ENTRY })}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        hidden
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.target.value = "";
        }}
      />

      <PhotoLightbox url={viewedUrl} onOpenChange={(open) => !open && setViewedUrl(null)} title={t.reportDetail.photosTitle} />
    </div>
  );
}
