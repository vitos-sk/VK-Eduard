import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types.gen";
import { getSignedPhotoUrls } from "@/modules/media/signedUrls";
import type { Site } from "./queries";

/**
 * Подписанные ссылки на фото объектов — по id объекта, для выбора объекта в формах. Объект без фото в карте
 * не появляется. Не получили ссылки (нет связи с хранилищем) — пустая карта: форма откроется, просто с заглушками.
 */
export async function getSitePhotoUrls(
  supabase: SupabaseClient<Database>,
  sites: readonly Site[],
): Promise<Record<string, string>> {
  const paths = sites.map((site) => site.photo_path).filter((path): path is string => Boolean(path));

  if (paths.length === 0) return {};

  try {
    const signed = await getSignedPhotoUrls(supabase, paths, "site-photos");
    const urls: Record<string, string> = {};

    for (const site of sites) {
      const url = site.photo_path ? signed.get(site.photo_path) : undefined;
      if (url) urls[site.id] = url;
    }

    return urls;
  } catch {
    return {};
  }
}
