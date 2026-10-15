"use client";

import { useMemo, useState } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";

import { usePhotoSources } from "@/components/shared/PhotoSourceInputs";
import { Thumb } from "@/components/shared/Thumb";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";
import type { SiteScene } from "@/lib/siteScene";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { compressImage } from "@/modules/media/compress";
import { createSignedUrlWithRetry } from "@/modules/media/signedUrls";
import { createSitePhotoUpload, setSitePhoto } from "@/modules/sites/photoActions";
import { SITE_PHOTOS_BUCKET } from "@/modules/sites/photoPath";

interface SiteCoverProps {
  siteId: string;
  scene: SiteScene;
  /** Подписанная ссылка на текущее фото объекта. */
  photoUrl: string | null;
  className?: string;
}

/**
 * Обложка на странице объекта с кнопкой «Додати фото» / «Змінити фото»: фото объекту может добавить любой сотрудник,
 * не только шеф и автор. Фото сжимается на телефоне, грузится по одноразовой ссылке с сервера, затем сервер
 * записывает его как обложку (`photoActions.ts`).
 */
export function SiteCover({ siteId, scene, photoUrl, className }: SiteCoverProps) {
  const t = useT();
  const supabase = useMemo(() => createClient(), []);
  const [isUploading, setIsUploading] = useState(false);
  // Новое фото показываем сразу, не дожидаясь, пока страница перечитается с сервера.
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const url = localUrl ?? photoUrl;

  async function handleFile(file: File | undefined) {
    if (!file) return;

    setIsUploading(true);

    try {
      const { blob } = await compressImage(file);

      const upload = await createSitePhotoUpload(siteId);
      if (upload.error !== null) throw new Error(upload.error);

      const { error: uploadError } = await supabase.storage
        .from(SITE_PHOTOS_BUCKET)
        .uploadToSignedUrl(upload.path, upload.token, blob, { contentType: "image/webp" });
      if (uploadError) throw uploadError;

      const saved = await setSitePhoto(siteId, upload.path);
      if (saved.error) throw new Error(saved.error);

      setLocalUrl(await createSignedUrlWithRetry(supabase, SITE_PHOTOS_BUCKET, upload.path));
    } catch {
      toast(t.objects.form.uploadPhotoError);
    } finally {
      setIsUploading(false);
    }
  }

  // Один выбор: на телефоне система сама предложит «Сделать фото» или «Из галереи».
  const { inputs, openGallery } = usePhotoSources((files) => void handleFile(files[0]), false);

  return (
    <div className="relative">
      <Thumb scene={scene} photoUrl={url} size="cover" className={className} />

      <Button
        variant="scrim"
        size="sm"
        onClick={openGallery}
        loading={isUploading}
        className={cn("absolute right-2.5 bottom-2.5")}
      >
        {!isUploading && <Camera className="size-4" strokeWidth={1.9} aria-hidden />}
        {isUploading ? t.objects.form.uploadingPhoto : url ? t.objects.form.changePhoto : t.objects.form.addPhoto}
      </Button>

      {inputs}
    </div>
  );
}
