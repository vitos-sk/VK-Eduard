import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Pencil } from "lucide-react";

import { BackHeader } from "@/components/layout/ScreenHeader";
import { ObjectArchiveButton } from "@/components/objects/ObjectArchiveButton";
import { ObjectDeleteButton } from "@/components/objects/ObjectDeleteButton";
import { ObjectHoursCard } from "@/components/objects/ObjectHoursCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ReportCard } from "@/components/shared/ReportCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { fmt } from "@/lib/format";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { getGoogleMapsDirectionsUrl } from "@/lib/utils";
import { requireProfile } from "@/modules/auth/session";
import { getSignedPhotoUrls } from "@/modules/media/signedUrls";
import { aggregateCategoryStats } from "@/modules/reports/categoryStats";
import { getReportsFeed, getSiteReportsFeed, getWorkCategories } from "@/modules/reports/queries";
import { getSiteById } from "@/modules/sites/queries";

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
  const coverPhotoUrl = site.photo_path ? coverPhotoUrls.get(site.photo_path) : null;

  return (
    <div className="pb-6">
      <BackHeader
        title={site.name}
        href="/objects"
        action={
          isBoss && (
            <Link
              href={`/objects/${site.id}/edit`}
              aria-label={t.objects.detail.edit}
              className="flex size-11 items-center justify-center rounded-full text-text transition-colors duration-150 active:bg-surface-2"
            >
              <Pencil className="size-5" strokeWidth={2} aria-hidden />
            </Link>
          )
        }
      />

      <div className="px-4 lg:hidden">
        <section className="rounded-[16px] border border-border bg-surface p-4">
          {coverPhotoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- подписанная ссылка Storage
            <img
              src={coverPhotoUrl}
              alt=""
              className="mb-4 h-[160px] w-full rounded-[12px] object-cover"
            />
          )}

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[20px] font-bold">{site.name}</p>
              {site.address ? (
                <a
                  href={getGoogleMapsDirectionsUrl(site.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-[14px] font-medium text-text-muted underline-offset-2 hover:underline"
                >
                  <MapPin className="size-[14px] shrink-0" strokeWidth={2} aria-hidden />
                  {site.address}
                </a>
              ) : (
                <p className="mt-1 text-[14px] font-medium text-text-muted">{t.common.dash}</p>
              )}
            </div>
            {site.archived_at ? (
              <span className="inline-flex shrink-0 items-center rounded-[8px] bg-surface-2 px-2 py-1 text-[11px] font-bold tracking-[0.06em] text-text-dim uppercase whitespace-nowrap">
                {t.objects.archivedBadge}
              </span>
            ) : (
              <StatusBadge status={site.status} />
            )}
          </div>

          <dl className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
            {site.kind && (
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[14px] font-medium text-text-muted">
                  {t.objects.detail.kind}
                </dt>
                <dd className="text-[14px] font-bold">{site.kind}</dd>
              </div>
            )}
          </dl>
        </section>

        {isBoss && (
          <ObjectHoursCard companyId={profile.company_id} site={site} className="mt-3" />
        )}

        {isBoss && (
          <div className="mt-3 flex flex-col gap-2">
            <ObjectArchiveButton siteId={site.id} isArchived={site.archived_at !== null} />
            <ObjectDeleteButton siteId={site.id} />
          </div>
        )}

        <div className="mt-6 flex items-baseline justify-between gap-3">
          <h2 className="text-[20px] font-bold">
            {isBoss ? t.objects.detail.reportsTitle : t.objects.detail.myReports}
          </h2>
          <span className="shrink-0 text-[13px] font-medium text-text-muted">
            {fmt(t.objects.reportsCount, { n: reports.length })}
          </span>
        </div>

        {categoryStats.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {categoryStats.map((stat) => (
              <span
                key={stat.id}
                className="rounded-full bg-surface-2 px-3 py-1 text-[12px] font-bold text-text-muted"
              >
                {`${stat.label} · ${stat.count}`}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-[13px] font-medium text-text-dim">
            {t.objects.detail.categoryStatsEmpty}
          </p>
        )}

        {reports.length > 0 ? (
          <div className="mt-3 space-y-3">
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

      {/* Desktop: фото/карта зліва, деталі + звіти справа — паралельна гілка, мобільна розмітка вище лишається без змін. */}
      <div className="hidden px-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-8">
        <div className="flex flex-col gap-4">
          <section className="rounded-[16px] border border-border bg-surface p-4">
            {coverPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- подписанная ссылка Storage
              <img
                src={coverPhotoUrl}
                alt=""
                className="h-[280px] w-full rounded-[12px] object-cover"
              />
            ) : (
              <div className="flex h-[280px] w-full items-center justify-center rounded-[12px] bg-surface-2 text-[14px] font-medium text-text-dim">
                {t.common.dash}
              </div>
            )}
          </section>

          {site.address && (
            <a
              href={getGoogleMapsDirectionsUrl(site.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[14px] font-medium text-text-muted underline-offset-2 hover:underline"
            >
              <MapPin className="size-[14px] shrink-0" strokeWidth={2} aria-hidden />
              {site.address}
            </a>
          )}
        </div>

        <div className="flex flex-col">
          <section className="rounded-[16px] border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[20px] font-bold">{site.name}</p>
                {!site.address && (
                  <p className="mt-1 text-[14px] font-medium text-text-muted">{t.common.dash}</p>
                )}
              </div>
              {site.archived_at ? (
                <span className="inline-flex shrink-0 items-center rounded-[8px] bg-surface-2 px-2 py-1 text-[11px] font-bold tracking-[0.06em] text-text-dim uppercase whitespace-nowrap">
                  {t.objects.archivedBadge}
                </span>
              ) : (
                <StatusBadge status={site.status} />
              )}
            </div>

            <dl className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
              {site.kind && (
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-[14px] font-medium text-text-muted">
                    {t.objects.detail.kind}
                  </dt>
                  <dd className="text-[14px] font-bold">{site.kind}</dd>
                </div>
              )}
            </dl>
          </section>

          {isBoss && (
            <ObjectHoursCard companyId={profile.company_id} site={site} className="mt-3" />
          )}

          {isBoss && (
            <div className="mt-3 flex flex-col gap-2">
              <ObjectArchiveButton siteId={site.id} isArchived={site.archived_at !== null} />
              <ObjectDeleteButton siteId={site.id} />
            </div>
          )}

          <div className="mt-6 flex items-baseline justify-between gap-3">
            <h2 className="text-[20px] font-bold">
              {isBoss ? t.objects.detail.reportsTitle : t.objects.detail.myReports}
            </h2>
            <span className="shrink-0 text-[13px] font-medium text-text-muted">
              {fmt(t.objects.reportsCount, { n: reports.length })}
            </span>
          </div>

          {categoryStats.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {categoryStats.map((stat) => (
                <span
                  key={stat.id}
                  className="rounded-full bg-surface-2 px-3 py-1 text-[12px] font-bold text-text-muted"
                >
                  {`${stat.label} · ${stat.count}`}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-[13px] font-medium text-text-dim">
              {t.objects.detail.categoryStatsEmpty}
            </p>
          )}

          {reports.length > 0 ? (
            <div className="mt-3 space-y-3">
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
