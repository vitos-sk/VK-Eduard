import { notFound } from "next/navigation";

import { ManualTimeScreen } from "@/components/time/ManualTimeScreen";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getEntryWithPhotos } from "@/modules/entries/queries";
import { getAllSites } from "@/modules/sites/queries";

/**
 * Редагування наявного запису — та сама форма, що й створення (`/time/manual`),
 * лише заздалегідь заповнена. `getAllSites`, а не `getActiveSites`: об'єкт
 * запису міг бути заархівований відтоді, і зникати з форми йому не можна —
 * інакше поле «Об'єкт» покаже пустушку замість того, що там реально було.
 */
export default async function EditManualTimePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireProfile();
  const supabase = await createClient();

  const [entry, sites] = await Promise.all([
    getEntryWithPhotos(supabase, id),
    getAllSites(supabase),
  ]);

  // RLS уже сховала чужі записи як відсутні — 404, а не «немає доступу».
  if (!entry || entry.ended_at === null) {
    notFound();
  }

  return <ManualTimeScreen sites={sites} entry={entry} />;
}
