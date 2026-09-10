import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types.gen";

const BUCKET = "entry-photos";
/** Час — тот же срок, что назван в ARCHITECTURE.md и REPORTS.md. */
const EXPIRES_IN_SECONDS = 60 * 60;

/**
 * Подписанные ссылки пачкой на все переданные пути разом — не по одной на
 * фото (REPORTS.md, раздел 7). Работает и с серверным, и с браузерным
 * клиентом: сервер зовёт это при первой отрисовке экрана, клиент —
 * при возврате на него, если пришлось ждать дольше часа.
 */
export async function getSignedPhotoUrls(
  supabase: SupabaseClient<Database>,
  storagePaths: readonly string[],
  bucket: string = BUCKET,
): Promise<Map<string, string>> {
  if (storagePaths.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls([...storagePaths], EXPIRES_IN_SECONDS);

  if (error) throw error;

  const map = new Map<string, string>();

  for (const item of data ?? []) {
    if (item.path && item.signedUrl) {
      map.set(item.path, item.signedUrl);
    }
  }

  return map;
}
