"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";

import { usePhotoSources } from "@/components/shared/PhotoSourceInputs";
import { Thumb } from "@/components/shared/Thumb";
import { Button } from "@/components/ui/button";
import { useSiteCoverUpload } from "@/components/objects/useSiteCoverUpload";
import { useT } from "@/lib/i18n/client";
import type { SiteScene } from "@/lib/siteScene";
import { cn } from "@/lib/utils";

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
  const uploadCover = useSiteCoverUpload(siteId);
  const [isUploading, setIsUploading] = useState(false);
  // Новое фото показываем сразу, не дожидаясь, пока страница перечитается с сервера.
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const url = localUrl ?? photoUrl;

  async function handleFile(file: File | undefined) {
    if (!file) return;

    setIsUploading(true);

    try {
      setLocalUrl((await uploadCover(file)).url);
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
