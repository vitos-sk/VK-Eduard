"use client";

import { useState } from "react";
import { Camera, ImagePlus } from "lucide-react";
import { toast } from "sonner";

import { useSiteCoverUpload } from "@/components/objects/useSiteCoverUpload";
import { useT } from "@/lib/i18n/client";
import { usePhotoSources } from "@/components/shared/PhotoSourceInputs";
import { cn } from "@/lib/utils";
import { NetworkButton } from "@/components/ui/network-button";

interface SitePhotoUploaderProps {
  siteId: string;
  photoPath: string | null;
  photoUrl: string | null;
  className?: string;
}

/**
 * Фото об'єкта на формі: квадратне прев'ю, тап відкриває
 * камеру/галерею. Нове фото одразу вантажиться і заміняє попереднє.
 * Усе робить сервер (`modules/sites/photoActions.ts`): записує нове фото й лише
 * після цього прибирає старе, тож при невдачі об'єкт не лишається без фото.
 * Працює для будь-якого співробітника, не тільки для шефа й автора об'єкта.
 */
export function SitePhotoUploader({
  siteId,
  photoPath,
  photoUrl,
  className,
}: SitePhotoUploaderProps) {
  const t = useT();
  const uploadCover = useSiteCoverUpload(siteId);
  const [isUploading, setIsUploading] = useState(false);
  const [path, setPath] = useState(photoPath);
  const [url, setUrl] = useState(photoUrl);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    setIsUploading(true);

    try {
      // Сервер сам записує фото обкладинкою і прибирає попереднє, тут лишається тільки показати результат.
      const uploaded = await uploadCover(file);

      setPath(uploaded.path);
      setUrl(uploaded.url);
    } catch {
      toast(t.objects.form.uploadPhotoError);
    } finally {
      setIsUploading(false);
    }
  };

  const { inputs, openCamera, openGallery } = usePhotoSources(
    (files) => void handleFile(files[0]),
    false,
  );

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <NetworkButton
        variant="secondary"
        size="bare"
        hint={false}
        onClick={openGallery}
        disabled={isUploading}
        aria-label={path ? t.objects.form.changePhoto : t.objects.form.addPhoto}
        className="relative size-20 shrink-0 justify-center overflow-hidden rounded-card border-edge"
      >
        {url && (
          // eslint-disable-next-line @next/next/no-img-element -- подписанная ссылка Storage
          <img src={url} alt="" className="size-full object-cover" />
        )}

        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-scrim text-on-scrim",
            url && "opacity-0 transition-opacity duration-150 hover:opacity-100",
          )}
        >
          <Camera className="size-5" strokeWidth={1.9} aria-hidden />
        </span>
      </NetworkButton>

      <div>
        <p className="text-[14px] font-semibold">
          {isUploading
            ? t.objects.form.uploadingPhoto
            : path
              ? t.objects.form.changePhoto
              : t.objects.form.addPhoto}
        </p>
        <p className="mt-0.5 text-[13px] text-ink-2">
          {t.objects.form.photoLabel}
        </p>
        <div className="mt-2 flex gap-2">
          <NetworkButton variant="outline" size="sm" hint={false} onClick={openCamera} disabled={isUploading}>
            <Camera className="size-4" strokeWidth={1.9} aria-hidden />
            {t.reportDetail.takePhoto}
          </NetworkButton>
          <NetworkButton variant="outline" size="sm" hint={false} onClick={openGallery} disabled={isUploading}>
            <ImagePlus className="size-4" strokeWidth={1.9} aria-hidden />
            {t.reportDetail.fromGallery}
          </NetworkButton>
        </div>
      </div>

      {inputs}
    </div>
  );
}
