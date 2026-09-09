import { notFound } from "next/navigation";

import { ReportDetail } from "@/components/reports/ReportDetail";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { isWithinEditWindow } from "@/modules/entries/editWindow";
import { getEntryWithPhotos } from "@/modules/entries/queries";
import { getSignedPhotoUrls } from "@/modules/media/signedUrls";
import { getSiteById } from "@/modules/sites/queries";
import { dateKeyOf } from "@/modules/time/calc";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const entry = await getEntryWithPhotos(supabase, id);

  // RLS прячет чужие записи как отсутствующие, а не как «нет доступа» —
  // 404 не выдаёт, что запись вообще существует у кого-то другого.
  if (!entry) {
    notFound();
  }

  const [site, photoUrls] = await Promise.all([
    entry.site_id ? getSiteById(supabase, entry.site_id) : Promise.resolve(null),
    getSignedPhotoUrls(
      supabase,
      entry.entry_photos.map((photo) => photo.storage_path),
    ),
  ]);

  const editable = isWithinEditWindow(
    entry.work_date,
    profile.role === "boss",
    dateKeyOf(new Date()),
  );

  return (
    <ReportDetail
      entry={entry}
      siteName={site?.name ?? null}
      companyId={profile.company_id}
      // Автор записи и её зритель — пока всегда один человек: вкладки
      // «Команда» (этап 6) ещё нет, шеф чужие звіти отсюда не открывает.
      authorName={profile.full_name}
      normMinutes={profile.daily_norm_minutes}
      editable={editable}
      photoUrls={Object.fromEntries(photoUrls)}
    />
  );
}
