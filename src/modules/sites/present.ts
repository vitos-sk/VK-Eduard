import type { SiteObject } from "@/lib/types";
import { sceneForId } from "@/lib/siteScene";
import type { SiteStats } from "@/modules/reports/siteStats";
import type { Site } from "./queries";

/** Приводит объект из базы к форме, которую рисуют `ObjectCard`/`Thumb`. */
export function toSiteObject(
  site: Site,
  stats: SiteStats | undefined,
  photoUrl: string | null = null,
): SiteObject {
  return {
    id: site.id,
    name: site.name,
    address: site.address ?? "",
    kind: site.kind ?? "",
    status: site.status,
    photosCount: stats?.photosCount ?? 0,
    reportsCount: stats?.reportsCount ?? 0,
    scene: sceneForId(site.id),
    archivedAt: site.archived_at,
    photoUrl,
  };
}
