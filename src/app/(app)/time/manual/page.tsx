import { ManualTimeScreen } from "@/components/time/ManualTimeScreen";
import { createClient } from "@/lib/supabase/server";
import { getActiveSites } from "@/modules/sites/queries";

export default async function ManualTimePage() {
  const supabase = await createClient();
  const sites = await getActiveSites(supabase);

  return <ManualTimeScreen sites={sites} />;
}
