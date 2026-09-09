"use client";

import { useMemo, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { toast } from "sonner";

import { fmt } from "@/lib/format";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import {
  MAX_PHOTOS_PER_ENTRY,
  deleteEntryPhoto,
  uploadEntryPhoto,
  type EntryPhoto,
} from "@/modules/media/photos";
import { cn } from "@/lib/utils";

const BUCKET = "entry-photos";

interface PhotoUploaderProps {
  companyId: string;
  entryId: string;
  photos: readonly EntryPhoto[];
  /** Подписанные ссылки: `storage_path` → URL. */
  urls: Readonly<Record<string, string>>;
  onPhotosChange: (photos: EntryPhoto[]) => void;
  onUrlsChange: (patch: Record<string, string>) => void;
  /** Вне окна правки (>7 дней рабочему) фото можно только смотреть. */
  editable: boolean;
  className?: string;
}

/**
 * Сетка фото записи: превью, кнопка «Додати» с камерой (`capture="environment"`,
 * REPORTS.md, раздел 6), удаление. Каждое фото сжимается и грузится сразу же
 * по выбору — не ждёт общего «Зберегти» (REPORTS.md, раздел 7: «фото уходят
 * фоном, карточка сразу видна»).
 */
export function PhotoUploader({
  companyId,
  entryId,
  photos,
  urls,
  onPhotosChange,
  onUrlsChange,
  editable,
  className,
}: PhotoUploaderProps) {
  const supabase = useMemo(() => createClient(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

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
        const photo = await uploadEntryPhoto(
          supabase,
          { companyId, entryId, sortOrder },
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

  const handleRemove = async (photo: EntryPhoto) => {
    try {
      await deleteEntryPhoto(supabase, photo);
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
              // eslint-disable-next-line @next/next/no-img-element -- подписанная ссылка Storage
              <img
                src={urls[photo.storage_path]}
                alt=""
                className="size-full object-cover"
              />
            )}

            {editable && (
              <button
                type="button"
                onClick={() => handleRemove(photo)}
                aria-label={t.reportDetail.removePhoto}
                className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <X className="size-3.5" strokeWidth={2.5} aria-hidden />
              </button>
            )}
          </div>
        ))}

        {editable && photos.length < MAX_PHOTOS_PER_ENTRY && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className={cn(
              "flex size-20 shrink-0 flex-col items-center justify-center gap-1 rounded-[12px]",
              "border border-dashed border-border text-text-muted",
              "transition-transform duration-150 active:scale-95",
              "disabled:pointer-events-none disabled:opacity-50",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
            )}
          >
            <Camera className="size-5" strokeWidth={2} aria-hidden />
            <span className="text-[11px] font-semibold">
              {isUploading ? t.reportDetail.uploading : t.reportDetail.addPhoto}
            </span>
          </button>
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
    </div>
  );
}
