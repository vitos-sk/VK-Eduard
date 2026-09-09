import { ReportForm } from "@/components/reports/ReportForm";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getEntriesFeed } from "@/modules/entries/queries";
import { getActiveSites } from "@/modules/sites/queries";

export default async function NewReportPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [sites, entries] = await Promise.all([
    getActiveSites(supabase),
    getEntriesFeed(supabase, profile.id),
  ]);

  return (
    <ReportForm
      companyId={profile.company_id}
      sites={sites}
      lastEntry={entries[0] ?? null}
    />
  );
}
