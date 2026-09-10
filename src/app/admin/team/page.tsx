import { AdminTeamScreen } from "@/components/admin/AdminTeamScreen";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getAllSites } from "@/modules/sites/queries";

export default async function AdminTeamPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const sites = await getAllSites(supabase);

  return <AdminTeamScreen companyId={profile.company_id} sites={sites} />;
}
