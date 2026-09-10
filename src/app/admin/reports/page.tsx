import { AdminReportsScreen } from "@/components/admin/AdminReportsScreen";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getAllSites } from "@/modules/sites/queries";
import { getCompanyWorkers } from "@/modules/team/queries";

export default async function AdminReportsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [sites, workers] = await Promise.all([
    getAllSites(supabase),
    getCompanyWorkers(supabase, profile.company_id),
  ]);

  return <AdminReportsScreen companyId={profile.company_id} sites={sites} workers={workers} />;
}
