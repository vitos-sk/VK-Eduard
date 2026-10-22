"use client";

import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { getSitePhotoUrls } from "@/modules/sites/photoUrls";
import type { Site } from "@/modules/sites/queries";

/** Подписанные ссылки на обложки объектов: `site id` → URL. Нет фото (или нет связи) — нет ключа. Пачкой, одним запросом. */
export function useSitePhotoUrls(sites: readonly Site[]): Readonly<Record<string, string>> {
  const supabase = useMemo(() => createClient(), []);
  const [urls, setUrls] = useState<Readonly<Record<string, string>>>({});

  const key = sites.map((site) => `${site.id}:${site.photo_path ?? ""}`).join("|");

  useEffect(() => {
    if (!sites.some((site) => site.photo_path)) return;

    let cancelled = false;

    getSitePhotoUrls(supabase, sites).then((signed) => {
      if (!cancelled) setUrls(signed);
    });

    return () => {
      cancelled = true;
    };
    // `key` заменяет `sites`: массив пересоздаётся на каждый рендер.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, key]);

  return urls;
}
