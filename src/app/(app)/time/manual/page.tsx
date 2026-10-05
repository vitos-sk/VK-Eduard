import { ManualTimeScreen } from "@/components/time/ManualTimeScreen";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getActiveSites } from "@/modules/sites/queries";

export default async function ManualTimePage() {
  const supabase = await createClient();
  const [profile, sites] = await Promise.all([requireProfile(), getActiveSites(supabase)]);

  return <ManualTimeScreen sites={sites} userId={profile.id} companyId={profile.company_id} />;
}
