"use client";

import { useMemo, useState } from "react";
import { Camera, ImagePlus } from "lucide-react";
import { toast } from "sonner";

import { useT } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";
import { uploadSitePhoto } from "@/modules/media/photos";
import { createSignedUrlWithRetry } from "@/modules/media/signedUrls";
import { usePhotoSources } from "@/components/shared/PhotoSourceInputs";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SitePhotoUploaderProps {
  companyId: string;
  siteId: string;
  photoPath: string | null;
  photoUrl: string | null;
  className?: string;
}

/**
 * Фото об'єкта на формі: квадратне прев'ю, тап відкриває
 * камеру/галерею. Нове фото одразу вантажиться і заміняє попереднє —
 * старий файл прибирається з Storage вже після успішного заміщення
 * (`photos.ts`: спочатку новий шлях у базі, потім видалення старого),
 * щоб при невдачі не лишити об'єкт зовсім без фото.
 */
export function SitePhotoUploader({
  companyId,
  siteId,
  photoPath,
  photoUrl,
  className,
}: SitePhotoUploaderProps) {
  const t = useT();
  const supabase = useMemo(() => createClient(), []);
  const [isUploading, setIsUploading] = useState(false);
  const [path, setPath] = useState(photoPath);
  const [url, setUrl] = useState(photoUrl);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    setIsUploading(true);
    const previousPath = path;

    try {
      const newPath = await uploadSitePhoto(supabase, { companyId, siteId }, file);
      const signedUrl = await createSignedUrlWithRetry(supabase, "site-photos", newPath);

      setPath(newPath);
      setUrl(signedUrl);

      if (previousPath) {
        await supabase.storage.from("site-photos").remove([previousPath]);
      }
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
      <Button
        variant="secondary"
        size="bare"
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
      </Button>

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
          <Button variant="outline" size="sm" onClick={openCamera} disabled={isUploading}>
            <Camera className="size-4" strokeWidth={1.9} aria-hidden />
            {t.reportDetail.takePhoto}
          </Button>
          <Button variant="outline" size="sm" onClick={openGallery} disabled={isUploading}>
            <ImagePlus className="size-4" strokeWidth={1.9} aria-hidden />
            {t.reportDetail.fromGallery}
          </Button>
        </div>
      </div>

      {inputs}
    </div>
  );
}
