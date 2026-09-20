"use client";

import { useMemo, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";

import type { SupabaseClient } from "@supabase/supabase-js";

import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { uploadSitePhoto } from "@/modules/media/photos";
import type { Database } from "@/lib/supabase/types.gen";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Storage іноді ще не бачить щойно завантажений файл на першому запиті
 * підписаної ссилки (eventual consistency бекенда) — `createSignedUrl`
 * повертає 404 одразу після успішного `upload()`. Кілька коротких
 * повторів прибирають цю гонку, не чіпаючи сам upload.
 */
async function createSignedUrlWithRetry(
  supabase: SupabaseClient<Database>,
  path: string,
): Promise<string | null> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (attempt > 0) await wait(400 * attempt);

    const { data } = await supabase.storage.from("site-photos").createSignedUrl(path, 3600);

    if (data?.signedUrl) return data.signedUrl;
  }

  return null;
}

interface SitePhotoUploaderProps {
  companyId: string;
  siteId: string;
  photoPath: string | null;
  photoUrl: string | null;
  className?: string;
}

/**
 * Аватарка об'єкта на формі редагування: кругле прев'ю, тап відкриває
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
  const supabase = useMemo(() => createClient(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [path, setPath] = useState(photoPath);
  const [url, setUrl] = useState(photoUrl);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    setIsUploading(true);
    const previousPath = path;

    try {
      const newPath = await uploadSitePhoto(supabase, { companyId, siteId }, file);
      const signedUrl = await createSignedUrlWithRetry(supabase, newPath);

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

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <Button
        variant="secondary"
        size="bare"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        aria-label={path ? t.objects.form.changePhoto : t.objects.form.addPhoto}
        className="relative size-20 shrink-0 justify-center overflow-hidden rounded-full border-border"
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
          <Camera className="size-5" strokeWidth={2} aria-hidden />
        </span>
      </Button>

      <div>
        <p className="text-[14px] font-bold">
          {isUploading
            ? t.objects.form.uploadingPhoto
            : path
              ? t.objects.form.changePhoto
              : t.objects.form.addPhoto}
        </p>
        <p className="mt-0.5 text-[13px] font-medium text-text-muted">
          {t.objects.form.photoLabel}
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </div>
  );
}
