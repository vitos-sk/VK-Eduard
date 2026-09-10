import type { SiteObject } from "@/lib/types";
import { gradientForId } from "@/lib/siteGradient";
import type { SiteStats } from "@/modules/entries/siteStats";
import type { Site } from "./queries";

/** Приводит объект из базы к форме, которую рисуют `ObjectCard`/`Thumb`. */
export function toSiteObject(site: Site, stats: SiteStats | undefined): SiteObject {
  return {
    id: site.id,
    name: site.name,
    address: site.address ?? "",
    status: site.status,
    photosCount: stats?.photosCount ?? 0,
    reportsCount: stats?.reportsCount ?? 0,
    gradient: gradientForId(site.id),
    archivedAt: site.archived_at,
  };
}
