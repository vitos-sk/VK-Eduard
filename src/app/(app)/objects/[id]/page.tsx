import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { BackHeader } from "@/components/layout/ScreenHeader";
import { ObjectArchiveButton } from "@/components/objects/ObjectArchiveButton";
import { ObjectDeleteButton } from "@/components/objects/ObjectDeleteButton";
import { ObjectHoursCard } from "@/components/objects/ObjectHoursCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ReportCard } from "@/components/shared/ReportCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Thumb } from "@/components/shared/Thumb";
import { Badge } from "@/components/ui/badge";
import { fmt } from "@/lib/format";
import { sceneForId } from "@/lib/siteScene";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { getGoogleMapsDirectionsUrl } from "@/lib/utils";
import { requireProfile } from "@/modules/auth/session";
import { getSignedPhotoUrls } from "@/modules/media/signedUrls";
import { aggregateCategoryStats } from "@/modules/reports/categoryStats";
import { getReportsFeed, getSiteReportsFeed, getWorkCategories } from "@/modules/reports/queries";
import { getSiteById } from "@/modules/sites/queries";
import { Ticket } from "@/components/ui/ticket";

/**
 * Объект: адрес, вид робіт, статус, мої звіти по ньому і статистика
 * розподілу цих звітів по категоріях робіт. «Хто працював» (командний
 * зріз) — цього тут немає: потрібна видимість по всій компанії, а не
 * тільки свої записи через RLS. Це вже етап 6, разом із вкладкою «Команда».
 */
export default async function ObjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();
  const isBoss = profile.role === "boss";

  const [site, allReports, categories] = await Promise.all([
    getSiteById(supabase, id),
    isBoss ? getSiteReportsFeed(supabase, id) : getReportsFeed(supabase, profile.id),
    getWorkCategories(supabase, profile.company_id),
  ]);

  if (!site) {
    notFound();
  }

  const canEdit = isBoss || site.created_by === profile.id;

  const reports = isBoss ? allReports : allReports.filter((report) => report.site_id === id);
  const categoryStats = aggregateCategoryStats(reports, categories);

  const firstPhotoPaths = reports
    .map((report) => report.report_photos[0]?.storage_path)
    .filter((path): path is string => Boolean(path));
  const [thumbUrls, coverPhotoUrls] = await Promise.all([
    getSignedPhotoUrls(supabase, firstPhotoPaths),
    site.photo_path
      ? getSignedPhotoUrls(supabase, [site.photo_path], "site-photos")
      : Promise.resolve(new Map<string, string>()),
  ]);
  const coverPhotoUrl = site.photo_path ? (coverPhotoUrls.get(site.photo_path) ?? null) : null;

  return (
    <div className="pb-6">
      <BackHeader
        title={t.objects.title}
        href="/objects"
        action={
          canEdit && (
            <Link
              href={`/objects/${site.id}/edit`}
              aria-label={t.objects.detail.edit}
              className="relative flex size-8 items-center justify-center rounded-md text-text outline-none before:absolute before:top-1/2 before:left-1/2 before:size-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] hover:bg-primary-tint focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Pencil className="size-5" strokeWidth={1.9} aria-hidden />
            </Link>
          )
        }
      />

      <div className="px-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-8 lg:px-0">
        <div className="flex flex-col gap-3">
          <Thumb
            scene={sceneForId(site.id)}
            photoUrl={coverPhotoUrl}
            size="cover"
            className="h-40 lg:h-[280px]"
          />

          <Ticket asChild variant="flat">
            <section>
              <div className="flex items-start justify-between gap-3">
                <h1 className="min-w-0 text-[22px] leading-tight font-semibold">{site.name}</h1>
                {site.archived_at ? (
                  <span className="shrink-0 pt-1 text-[12px] font-semibold tracking-[0.04em] text-ink-2 uppercase">
                    {t.objects.archivedBadge}
                  </span>
                ) : (
                  <StatusBadge status={site.status} className="shrink-0 pt-1" />
                )}
              </div>

              <dl className="perf-t mt-3 flex flex-col gap-2.5 pt-3 text-[14px]">
                {site.kind && (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-ink-2">{t.objects.detail.kind}</dt>
                    <dd className="font-medium">{site.kind}</dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-ink-2">{t.objects.detail.address}</dt>
                  <dd className="min-w-0 text-right font-medium">{site.address || t.common.dash}</dd>
                </div>
              </dl>

              {site.address && (
                <a
                  href={getGoogleMapsDirectionsUrl(site.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative mt-3 inline-block text-[13px] font-semibold text-primary outline-none before:absolute before:-inset-y-3 before:-inset-x-2 before:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {t.objects.detail.openInMaps}
                </a>
              )}
            </section>
          </Ticket>

          {isBoss && <ObjectHoursCard companyId={profile.company_id} site={site} />}

          {isBoss && (
            <div className="flex flex-col gap-2">
              <ObjectArchiveButton siteId={site.id} isArchived={site.archived_at !== null} />
              <ObjectDeleteButton siteId={site.id} />
            </div>
          )}
        </div>

        <div className="mt-[18px] lg:mt-0">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[13px] font-medium text-ink-2 lg:text-[20px] lg:font-semibold lg:text-ink">
              {isBoss ? t.objects.detail.reportsTitle : t.objects.detail.myReports}
            </h2>
            <span className="tabular shrink-0 text-[13px] text-ink-2">
              {fmt(t.objects.reportsCount, { n: reports.length })}
            </span>
          </div>

          {categoryStats.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {categoryStats.map((stat) => (
                <Badge key={stat.id}>{`${stat.label} · ${stat.count}`}</Badge>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[13px] text-ink-2">{t.objects.detail.categoryStatsEmpty}</p>
          )}

          {reports.length > 0 ? (
            <div className="mt-3 space-y-2">
              {reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  siteName={site.name}
                  categories={categories}
                  thumbUrl={
                    report.report_photos[0]
                      ? (thumbUrls.get(report.report_photos[0].storage_path) ?? null)
                      : null
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyState
              className="mt-4"
              title={isBoss ? t.objects.detail.emptyTitleAll : t.objects.detail.emptyTitle}
              description={isBoss ? undefined : t.objects.detail.emptyHint}
            />
          )}
        </div>
      </div>
    </div>
  );
}
