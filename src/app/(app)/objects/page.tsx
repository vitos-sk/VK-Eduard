import { endOfMonth, startOfMonth } from "date-fns";

import { ObjectsScreen } from "@/components/objects/ObjectsScreen";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getCompanyEntriesInRange, getEntriesFeed } from "@/modules/entries/queries";
import { aggregateSiteStats } from "@/modules/entries/siteStats";
import { getSignedPhotoUrls } from "@/modules/media/signedUrls";
import { toSiteObject } from "@/modules/sites/present";
import { getAllSites } from "@/modules/sites/queries";
import { dateKeyOf } from "@/modules/time/calc";

/**
 * Список объектов компании. Фото/звіти в карточке — не из отдельных
 * счётчиков в базе (их там нет), а посчитаны из своих же записей:
 * рабочий и через RLS не увидел бы чужие, поэтому считать иначе бессмысленно.
 */
export default async function ObjectsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const isBoss = profile.role === "boss";
  const now = new Date();

  const [sites, entries, monthEntries] = await Promise.all([
    getAllSites(supabase),
    getEntriesFeed(supabase, profile.id),
    // Години/люди по об'єктах за поточний місяць — тільки boss (RLS дає всі записи).
    isBoss
      ? getCompanyEntriesInRange(
          supabase,
          profile.company_id,
          dateKeyOf(startOfMonth(now)),
          dateKeyOf(endOfMonth(now)),
        )
      : Promise.resolve(undefined),
  ]);

  const stats = aggregateSiteStats(entries);
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
      initialEntries={monthEntries}
    />
  );
}
