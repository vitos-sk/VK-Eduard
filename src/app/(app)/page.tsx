import { HomeHeader } from "@/components/home/HomeHeader";
import { WorkTimeCard } from "@/components/home/WorkTimeCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ObjectCard } from "@/components/shared/ObjectCard";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { fmt, formatDateLong } from "@/lib/format";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { initialsOf, requireProfile } from "@/modules/auth/session";
import { getEntriesFeed, getOpenEntry } from "@/modules/entries/queries";
import { aggregateSiteStats } from "@/modules/entries/siteStats";
import { toSiteObject } from "@/modules/sites/present";
import { getActiveSites } from "@/modules/sites/queries";

/** Сколько объектов показывать в блоке «Мої об'єкти» на главной. */
const HOME_OBJECTS_LIMIT = 3;

export default async function HomePage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [openEntry, entries, sites] = await Promise.all([
    getOpenEntry(supabase, profile.id),
    getEntriesFeed(supabase, profile.id),
    getActiveSites(supabase),
  ]);

  const stats = aggregateSiteStats(entries);

  // «Мої» — те, на яких я реально працював, найсвіжіші зверху; поки історії
  // немає (новий співробітник), показуємо перші активні об'єкти компанії —
  // порожній блок на головній нічого не пояснює новачку.
  const recentSiteIds = [...stats.entries()]
    .sort((a, b) => (b[1].lastWorkedDate ?? "").localeCompare(a[1].lastWorkedDate ?? ""))
    .map(([siteId]) => siteId);

  const orderedSites = [
    ...recentSiteIds.map((id) => sites.find((site) => site.id === id)).filter(Boolean),
    ...sites.filter((site) => !recentSiteIds.includes(site.id)),
  ].slice(0, HOME_OBJECTS_LIMIT) as typeof sites;

  const homeObjects = orderedSites.map((site) => toSiteObject(site, stats.get(site.id)));

  return (
    <div className="px-4 pb-6">
      <HomeHeader initials={initialsOf(profile)} />

      <div className="mt-6">
        <h1 className="text-[26px] leading-tight font-extrabold tracking-tight">
          {fmt(t.home.greeting, { name: profile.full_name })}
        </h1>
        <p className="mt-1 text-[15px] font-medium text-text-muted">
          {formatDateLong(new Date())}
        </p>
      </div>

      <WorkTimeCard className="mt-5" openEntry={openEntry} />

      <SectionHeader
        className="mt-6"
        title={t.home.myObjects}
        action={{ label: t.home.viewAll, href: "/objects" }}
      />

      {homeObjects.length > 0 ? (
        <div className="mt-3 space-y-3">
          {homeObjects.map((object) => (
            <ObjectCard key={object.id} object={object} />
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-3"
          title={t.objects.emptyTitle}
          description={t.objects.emptyHint}
        />
      )}
    </div>
  );
}
