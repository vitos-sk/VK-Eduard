import { ChecklistsScreen } from "@/components/checklists/ChecklistsScreen";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getMyChecklists } from "@/modules/checklists/queries";

export default async function ChecklistsPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { deleted } = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();
  const entries = await getMyChecklists(supabase, profile.id);

  return <ChecklistsScreen entries={entries} justDeleted={deleted === "1"} />;
}
