import { notFound, redirect } from "next/navigation";

import { ObjectForm } from "@/components/objects/ObjectForm";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getSignedPhotoUrls } from "@/modules/media/signedUrls";
import { getSiteById } from "@/modules/sites/queries";

/** Редагування об'єкта — шеф або його автор. */
export default async function EditObjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();

  const supabase = await createClient();
  const site = await getSiteById(supabase, id);

  if (!site) {
    notFound();
  }

  // Правити можуть шеф і автор об'єкта (RLS `sites_update`).
  if (profile.role !== "boss" && site.created_by !== profile.id) {
    redirect(`/objects/${id}`);
  }

  const photoUrl = site.photo_path
    ? ((await getSignedPhotoUrls(supabase, [site.photo_path], "site-photos")).get(
        site.photo_path,
      ) ?? null)
    : null;

  return <ObjectForm site={site} companyId={profile.company_id} photoUrl={photoUrl} />;
}
