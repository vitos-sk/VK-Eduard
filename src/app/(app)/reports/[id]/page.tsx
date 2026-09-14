import { notFound } from "next/navigation";

import { ReportDetail } from "@/components/reports/ReportDetail";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getSignedPhotoUrls } from "@/modules/media/signedUrls";
import { getReportWithPhotos, getWorkCategories } from "@/modules/reports/queries";
import { getSiteById } from "@/modules/sites/queries";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const report = await getReportWithPhotos(supabase, id);

  // RLS прячет чужие записи как отсутствующие, а не как «нет доступа».
  if (!report) {
    notFound();
  }

  const [site, photoUrls, categories] = await Promise.all([
    report.site_id ? getSiteById(supabase, report.site_id) : Promise.resolve(null),
    getSignedPhotoUrls(
      supabase,
      report.report_photos.map((photo) => photo.storage_path),
    ),
    getWorkCategories(supabase, profile.company_id),
  ]);

  return (
    <ReportDetail
      report={report}
      siteName={site?.name ?? null}
      companyId={profile.company_id}
      authorName={report.author_full_name}
      categories={categories}
      // `getReportWithPhotos` уже прогнала запись через `reports_select`:
      // якщо вона тут — це або своя, або ми шеф, а обидва варианты
      // `reports_update`/`reports_delete` дозволяють без обмежень.
      editable
      photoUrls={Object.fromEntries(photoUrls)}
    />
  );
}
