import { ReportsScreen } from "@/components/reports/ReportsScreen";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getSignedPhotoUrls } from "@/modules/media/signedUrls";
import { getReportsFeed, getWorkCategories } from "@/modules/reports/queries";
import { getAllSites } from "@/modules/sites/queries";

/**
 * Лента «Звіти». Подписанные ссылки первых фото собраны пачкой одним
 * запросом на весь экран (REPORTS.md, раздел 7), а не по одной на карточку.
 */
export default async function ReportsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [reports, sites, categories] = await Promise.all([
    getReportsFeed(supabase, profile.id),
    getAllSites(supabase),
    getWorkCategories(supabase, profile.company_id),
  ]);

  const firstPhotoPaths = reports
    .map((report) => report.report_photos[0]?.storage_path)
    .filter((path): path is string => Boolean(path));

  const thumbUrls = await getSignedPhotoUrls(supabase, firstPhotoPaths);

  return (
    <ReportsScreen
      profile={profile}
      reports={reports}
      sites={sites}
      categories={categories}
      thumbUrls={Object.fromEntries(thumbUrls)}
    />
  );
}
