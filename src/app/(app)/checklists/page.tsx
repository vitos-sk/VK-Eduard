import { ChecklistsScreen } from "@/components/checklists/ChecklistsScreen";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getMyChecklists } from "@/modules/checklists/queries";

export default async function ChecklistsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const entries = await getMyChecklists(supabase, profile.id);

  return <ChecklistsScreen entries={entries} />;
}
