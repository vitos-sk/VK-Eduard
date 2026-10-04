import { ObjectsScreen } from "@/components/objects/ObjectsScreen";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getCompanyReportsWithPhotos } from "@/modules/reports/queries";
import { aggregateSiteStats } from "@/modules/reports/siteStats";
import { getSignedPhotoUrls } from "@/modules/media/signedUrls";
import { toSiteObject } from "@/modules/sites/present";
import { getAllSites } from "@/modules/sites/queries";

/**
 * Список объектов компании. Фото/звіти в карточке — не из отдельных
 * счётчиков в базе (их там нет), а посчитаны из звітів (`site_reports`) всей компании; RLS сама
 * отдаёт шефу все, а рабочему — только его.
 */
export default async function ObjectsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const isBoss = profile.role === "boss";

  const [sites, reports] = await Promise.all([
    getAllSites(supabase),
    getCompanyReportsWithPhotos(supabase, profile.company_id),
  ]);

  const stats = aggregateSiteStats(reports);
  const photoPaths = sites
    .map((site) => site.photo_path)
    .filter((path): path is string => Boolean(path));
  const photoUrls = await getSignedPhotoUrls(supabase, photoPaths, "site-photos");
  const objects = sites.map((site) =>
    toSiteObject(
      site,
      stats.get(site.id),
      site.photo_path ? (photoUrls.get(site.photo_path) ?? null) : null,
    ),
  );

  return (
    <ObjectsScreen
      objects={objects}
      isBoss={isBoss}
      profile={profile}
    />
  );
}
