import { ObjectsScreen } from "@/components/objects/ObjectsScreen";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getEntriesFeed } from "@/modules/entries/queries";
import { aggregateSiteStats } from "@/modules/entries/siteStats";
import { toSiteObject } from "@/modules/sites/present";
import { getAllSites } from "@/modules/sites/queries";

/**
 * Список объектов компании. Фото/звіти в карточке — не из отдельных
 * счётчиков в базе (их там нет), а посчитаны из своих же записей:
 * рабочий и через RLS не увидел бы чужие, поэтому считать иначе бессмысленно.
 */
export default async function ObjectsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [sites, entries] = await Promise.all([
    getAllSites(supabase),
    getEntriesFeed(supabase, profile.id),
  ]);

  const stats = aggregateSiteStats(entries);
  const objects = sites.map((site) => toSiteObject(site, stats.get(site.id)));

  return <ObjectsScreen objects={objects} isBoss={profile.role === "boss"} />;
}
