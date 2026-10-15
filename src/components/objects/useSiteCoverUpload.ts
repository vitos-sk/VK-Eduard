"use client";

import { useCallback, useMemo } from "react";

import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/modules/media/compress";
import { createSignedUrlWithRetry } from "@/modules/media/signedUrls";
import { createSitePhotoUpload, setSitePhoto } from "@/modules/sites/photoActions";
import { SITE_PHOTOS_BUCKET } from "@/modules/sites/photoPath";
import { uploadSiteCover } from "@/modules/sites/photoUpload";

/**
 * Загрузка фото объекта из браузера: сжатие на телефоне, загрузка по одноразовой ссылке, запись обложкой на сервере.
 * Работает для любого сотрудника фирмы (см. `modules/sites/photoActions.ts`). Возвращает путь и ссылку для показа;
 * при любом сбое бросает исключение, обложка при этом не меняется.
 */
export function useSiteCoverUpload(siteId: string) {
  const supabase = useMemo(() => createClient(), []);

  return useCallback(
    async (file: File): Promise<{ path: string; url: string | null }> => {
      const path = await uploadSiteCover(siteId, file, {
        compress: async (source) => (await compressImage(source)).blob,
        createUpload: createSitePhotoUpload,
        upload: async (target, token, blob) => {
          const { error } = await supabase.storage
            .from(SITE_PHOTOS_BUCKET)
            .uploadToSignedUrl(target, token, blob, { contentType: "image/webp" });
          if (error) throw error;
        },
        setPhoto: setSitePhoto,
      });

      return { path, url: await createSignedUrlWithRetry(supabase, SITE_PHOTOS_BUCKET, path) };
    },
    [siteId, supabase],
  );
}
