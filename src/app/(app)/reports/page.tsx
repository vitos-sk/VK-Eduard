import { ReportsScreen } from "@/components/reports/ReportsScreen";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getEntriesFeed } from "@/modules/entries/queries";
import { getSignedPhotoUrls } from "@/modules/media/signedUrls";
import { getAllSites } from "@/modules/sites/queries";

/**
 * Лента «Звіти». Подписанные ссылки первых фото собраны пачкой одним
 * запросом на весь экран (REPORTS.md, раздел 7), а не по одной на карточку.
 */
export default async function ReportsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [entries, sites] = await Promise.all([
    getEntriesFeed(supabase, profile.id),
    getAllSites(supabase),
  ]);

  const firstPhotoPaths = entries
    .map((entry) => entry.entry_photos[0]?.storage_path)
    .filter((path): path is string => Boolean(path));

  const thumbUrls = await getSignedPhotoUrls(supabase, firstPhotoPaths);

  return (
    <ReportsScreen
      entries={entries}
      sites={sites}
      thumbUrls={Object.fromEntries(thumbUrls)}
    />
  );
}
