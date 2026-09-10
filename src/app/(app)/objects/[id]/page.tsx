import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { BackHeader } from "@/components/layout/ScreenHeader";
import { ObjectArchiveButton } from "@/components/objects/ObjectArchiveButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ReportCard } from "@/components/shared/ReportCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatHoursShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getEntriesFeed } from "@/modules/entries/queries";
import { getSignedPhotoUrls } from "@/modules/media/signedUrls";
import { getSiteById } from "@/modules/sites/queries";
import { sumTotalMinutes } from "@/modules/time/calc";

/**
 * Объект: адрес, вид робіт, статус, скільки часу тут відпрацьовано і мої
 * звіти по ньому. «Хто працював» (командний зріз) — цього тут немає:
 * потрібна видимість по всій компанії, а не тільки свої записи через RLS.
 * Це вже етап 6, разом із вкладкою «Команда».
 */
export default async function ObjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const [site, allEntries] = await Promise.all([
    getSiteById(supabase, id),
    getEntriesFeed(supabase, profile.id),
  ]);

  if (!site) {
    notFound();
  }

  const entries = allEntries.filter((entry) => entry.site_id === id);
  const totalMinutes = sumTotalMinutes(entries);

  const firstPhotoPaths = entries
    .map((entry) => entry.entry_photos[0]?.storage_path)
    .filter((path): path is string => Boolean(path));
  const thumbUrls = await getSignedPhotoUrls(supabase, firstPhotoPaths);
  const now = new Date();

  const isBoss = profile.role === "boss";

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

      <div className="px-4">
        <section className="rounded-[16px] border border-border bg-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[20px] font-bold">{site.name}</p>
              <p className="mt-1 text-[14px] font-medium text-text-muted">
                {site.address || t.common.dash}
              </p>
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
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[14px] font-medium text-text-muted">
                {t.objects.detail.totalWorked}
              </dt>
              <dd className="tabular text-[14px] font-bold">
                {formatHoursShort(totalMinutes)}
              </dd>
            </div>
          </dl>
        </section>

        {isBoss && (
          <ObjectArchiveButton
            className="mt-3"
            siteId={site.id}
            isArchived={site.archived_at !== null}
          />
        )}

        <h2 className="mt-6 text-[20px] font-bold">{t.objects.detail.myReports}</h2>

        {entries.length > 0 ? (
          <div className="mt-3 space-y-3">
            {entries.map((entry) => (
              <ReportCard
                key={entry.id}
                entry={entry}
                siteName={site.name}
                thumbUrl={
                  entry.entry_photos[0]
                    ? (thumbUrls.get(entry.entry_photos[0].storage_path) ?? null)
                    : null
                }
                now={now}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            className="mt-4"
            title={t.objects.detail.emptyTitle}
            description={t.objects.detail.emptyHint}
          />
        )}
      </div>
    </div>
  );
}
