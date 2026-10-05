import { eachDayOfInterval, startOfWeek } from "date-fns";

import { DayReportCard } from "@/components/home/DayReportCard";
import { Greeting } from "@/components/home/Greeting";
import { HomeHeader } from "@/components/home/HomeHeader";
import { HomeObjectCard } from "@/components/home/HomeObjectCard";
import { LastReportCard } from "@/components/home/LastReportCard";
import { WeekStats, type WeekDay } from "@/components/home/WeekStats";
import { EmptyState } from "@/components/shared/EmptyState";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { formatDateLong, formatHoursShort } from "@/lib/format";
import { getLocale, getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { initialsOf } from "@/components/shared/Thumb";
import { requireProfile } from "@/modules/auth/session";
import { getEntriesFeed } from "@/modules/entries/queries";
import { getSignedPhotoUrls } from "@/modules/media/signedUrls";
import { categoryLabelsOf } from "@/modules/reports/categoryLabels";
import { getCompanyReportsWithPhotos, getWorkCategories } from "@/modules/reports/queries";
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
  const t = await getT();
  const locale = await getLocale();
  const profile = await requireProfile();
  const supabase = await createClient();

  const [entries, companyReports, sites, categories] = await Promise.all([
    getEntriesFeed(supabase, profile.id),
    getCompanyReportsWithPhotos(supabase, profile.company_id),
    getActiveSites(supabase),
    getWorkCategories(supabase, profile.company_id),
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

  // Талон дня: сьогоднішні години, об'єкт останнього запису дня.
  const todayEntries = entries.filter((entry) => entry.work_date === todayKey);
  const todayMinutes = sumTotalMinutes(todayEntries);
  const todaySiteId = [...todayEntries].reverse().find((entry) => entry.site_id)?.site_id ?? null;
  const todaySiteName = todaySiteId
    ? (sites.find((site) => site.id === todaySiteId)?.name ?? null)
    : null;

  // Міні-талони тижня: з понеділка по сьогодні, у ряд лишаються останні чотири дні.
  const weekDays: WeekDay[] = eachDayOfInterval({
    start: startOfWeek(now, { weekStartsOn: 1 }),
    end: now,
  })
    .slice(-4)
    .map((date) => {
      const key = dateKeyOf(date);
      const dayMinutes = sumTotalMinutes(entries.filter((entry) => entry.work_date === key));
      const hasReport = myReports.some((report) => report.work_date === key && isReady(report));

      return {
        key,
        weekday: t.weekdays.short[date.getDay()],
        day: date.getDate(),
        hours: dayMinutes > 0 ? formatHoursShort(dayMinutes) : null,
        report: hasReport ? "submitted" : dayMinutes > 0 ? "notSubmitted" : null,
      };
    });

  return (
    <div className="mx-auto max-w-[640px] px-4 pb-6 lg:px-0">
      <HomeHeader
        initials={initialsOf(profile.full_name)}
        title={<Greeting name={profile.full_name} />}
        subtitle={formatDateLong(now, locale)}
      />

      <DayReportCard
        className="mt-[18px]"
        date={now}
        minutes={todayMinutes}
        normMinutes={profile.daily_norm_minutes}
        siteName={todaySiteName}
        reportId={todayReport?.id ?? null}
      />

      <SectionHeader
        className="mt-[18px]"
        title={t.home.week.title}
        trailing={
          <span className="tabular ml-auto text-[13px] text-ink-2">
            {formatHoursShort(sumTotalMinutes(weekEntries))}
          </span>
        }
      />
      <WeekStats className="mt-2" days={weekDays} />

      <SectionHeader
        className="mt-[18px]"
        title={t.home.myObjects}
        action={{ label: t.home.viewAll, href: "/objects" }}
      />
      {homeObjects.length > 0 ? (
        <div className="no-scrollbar -mx-4 mt-2 flex snap-x gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          {homeObjects.map((object) => (
            <HomeObjectCard
              key={object.id}
              object={object}
              className="w-[140px] shrink-0 snap-start"
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

      {lastReport && (
        <>
          <SectionHeader
            className="mt-[18px]"
            title={t.home.lastReport.title}
            action={{ label: t.home.lastReport.open, href: `/reports/${lastReport.id}` }}
          />
          <div className="mt-2">
            <LastReportCard
              reportId={lastReport.id}
              workDate={lastReport.work_date}
              siteName={lastReportSite?.name ?? t.hours.noObject}
              worksLabel={categoryLabelsOf(lastReport, categories, t).join(", ")}
              minutes={lastReportMinutes}
              photosCount={lastReport.report_photos.length}
              thumbUrl={lastReportPhotoPath ? (reportPhotoUrls.get(lastReportPhotoPath) ?? null) : null}
              isReady={isReady(lastReport)}
            />
          </div>
        </>
      )}
    </div>
  );
}
