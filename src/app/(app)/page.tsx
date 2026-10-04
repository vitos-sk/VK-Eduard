import { startOfWeek } from "date-fns";

import { DayReportCard } from "@/components/home/DayReportCard";
import { Greeting } from "@/components/home/Greeting";
import { HomeHeader } from "@/components/home/HomeHeader";
import { HomeObjectCard } from "@/components/home/HomeObjectCard";
import { LastReportCard } from "@/components/home/LastReportCard";
import { WeekStats } from "@/components/home/WeekStats";
import { EmptyState } from "@/components/shared/EmptyState";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { formatDateFull } from "@/lib/format";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { initialsOf, requireProfile } from "@/modules/auth/session";
import { getEntriesFeed } from "@/modules/entries/queries";
import { getSignedPhotoUrls } from "@/modules/media/signedUrls";
import { getCompanyReportsWithPhotos } from "@/modules/reports/queries";
import { reportState } from "@/modules/reports/reportState";
import { aggregateSiteStats } from "@/modules/reports/siteStats";
import { toSiteObject } from "@/modules/sites/present";
import { getActiveSites } from "@/modules/sites/queries";
import { dateKeyOf, sumTotalMinutes } from "@/modules/time/calc";

/** Сколько объектов показывать в ленте «Мої об'єкти» на главной. */
const HOME_OBJECTS_LIMIT = 6;

/**
 * Головна працівника: подати звіт за день, мої об'єкти, підсумок тижня,
 * останній звіт. Ніяких таймерів і форм — години додаються через «+».
 */
export default async function HomePage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [entries, companyReports, sites] = await Promise.all([
    getEntriesFeed(supabase, profile.id),
    getCompanyReportsWithPhotos(supabase, profile.company_id),
    getActiveSites(supabase),
  ]);

  const now = new Date();
  const todayKey = dateKeyOf(now);
  const weekStartKey = dateKeyOf(startOfWeek(now, { weekStartsOn: 1 }));

  // Лічильники в картках об'єктів — по всіх звітах об'єкта; «мої» — де я писав звіти.
  const stats = aggregateSiteStats(companyReports);
  const myReports = companyReports
    .filter((report) => report.author_id === profile.id)
    .sort(
      (a, b) =>
        b.work_date.localeCompare(a.work_date) || b.created_at.localeCompare(a.created_at),
    );

  const isReady = (report: (typeof myReports)[number]) =>
    reportState(report, report.report_photos.length) === "ready";

  const todayReport = myReports.find((report) => report.work_date === todayKey && isReady(report));
  const lastReport = myReports.find(isReady) ?? myReports[0] ?? null;

  // Мої об'єкти: найсвіжіші за моїми звітами; новачку — перші активні об'єкти.
  const recentSiteIds = [
    ...aggregateSiteStats(myReports).entries(),
  ]
    .sort((a, b) => (b[1].lastWorkedDate ?? "").localeCompare(a[1].lastWorkedDate ?? ""))
    .map(([siteId]) => siteId);
  const orderedSites = [
    ...recentSiteIds.map((id) => sites.find((site) => site.id === id)).filter(Boolean),
    ...sites.filter((site) => !recentSiteIds.includes(site.id)),
  ].slice(0, HOME_OBJECTS_LIMIT) as typeof sites;

  // Тиждень: з понеділка по сьогодні.
  const weekEntries = entries.filter((entry) => entry.work_date >= weekStartKey);
  const weekReports = myReports.filter(
    (report) => report.work_date >= weekStartKey && isReady(report),
  );
  const weekSiteIds = new Set(
    weekEntries.map((entry) => entry.site_id).filter((id): id is string => Boolean(id)),
  );

  const lastReportSite = lastReport ? sites.find((site) => site.id === lastReport.site_id) : null;

  const objectPhotoPaths = orderedSites
    .map((site) => site.photo_path)
    .filter((path): path is string => Boolean(path));
  const lastReportPhotoPath = lastReport?.report_photos[0]?.storage_path;
  const [objectPhotoUrls, reportPhotoUrls] = await Promise.all([
    getSignedPhotoUrls(supabase, objectPhotoPaths, "site-photos"),
    getSignedPhotoUrls(supabase, lastReportPhotoPath ? [lastReportPhotoPath] : []),
  ]);

  const homeObjects = orderedSites.map((site) =>
    toSiteObject(
      site,
      stats.get(site.id),
      site.photo_path ? (objectPhotoUrls.get(site.photo_path) ?? null) : null,
    ),
  );

  const lastReportMinutes = lastReport
    ? sumTotalMinutes(entries.filter((entry) => entry.work_date === lastReport.work_date))
    : 0;

  return (
    <div className="mx-auto max-w-[640px] px-4 pb-6 lg:px-0">
      <HomeHeader initials={initialsOf(profile)} />

      <div className="mt-6">
        <h1 className="text-[26px] leading-tight font-extrabold tracking-tight">
          <Greeting name={profile.full_name} />
        </h1>
        <p className="mt-1 text-[15px] font-medium text-text-muted">{formatDateFull(now)}</p>
      </div>

      <DayReportCard className="mt-5" reportId={todayReport?.id ?? null} />

      <SectionHeader
        className="mt-6"
        title={t.home.myObjects}
        action={{ label: t.home.viewAll, href: "/objects" }}
      />
      {homeObjects.length > 0 ? (
        <div className="-mx-4 mt-2 flex snap-x gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
          {homeObjects.map((object) => (
            <HomeObjectCard
              key={object.id}
              object={object}
              className="w-[190px] shrink-0 snap-start"
            />
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-3"
          title={t.objects.emptyTitle}
          description={t.objects.emptyHint}
        />
      )}

      <SectionHeader className="mt-6" title={t.home.week.title} />
      <WeekStats
        className="mt-2"
        minutes={sumTotalMinutes(weekEntries)}
        reportsCount={weekReports.length}
        objectsCount={weekSiteIds.size}
      />

      {lastReport && (
        <>
          <SectionHeader
            className="mt-6"
            title={t.home.lastReport.title}
            action={{ label: t.home.lastReport.open, href: `/reports/${lastReport.id}` }}
          />
          <LastReportCard
            reportId={lastReport.id}
            workDate={lastReport.work_date}
            siteId={lastReport.site_id}
            siteName={lastReportSite?.name ?? t.hours.noObject}
            siteAddress={lastReportSite?.address ?? ""}
            thumbUrl={lastReportPhotoPath ? (reportPhotoUrls.get(lastReportPhotoPath) ?? null) : null}
            minutes={lastReportMinutes}
            photosCount={lastReport.report_photos.length}
            worksCount={lastReport.category_ids.length}
            isReady={isReady(lastReport)}
          />
        </>
      )}
    </div>
  );
}
