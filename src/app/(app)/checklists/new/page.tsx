import { ChecklistForm } from "@/components/checklists/ChecklistForm";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getActiveSites } from "@/modules/sites/queries";

export default async function NewChecklistPage() {
  await requireProfile();
  const supabase = await createClient();
  const sites = await getActiveSites(supabase);

  return <ChecklistForm sites={sites} />;
}
