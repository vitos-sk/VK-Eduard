import { AdminObjectsScreen } from "@/components/admin/AdminObjectsScreen";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getSignedPhotoUrls } from "@/modules/media/signedUrls";
import { getAllSites } from "@/modules/sites/queries";

export default async function AdminObjectsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const sites = await getAllSites(supabase);

  const photoPaths = sites
    .map((site) => site.photo_path)
    .filter((path): path is string => Boolean(path));
  const photoUrls = await getSignedPhotoUrls(supabase, photoPaths, "site-photos");

  return (
    <AdminObjectsScreen sites={sites} photoUrls={photoUrls} companyId={profile.company_id} />
  );
}
