import { ReportForm } from "@/components/reports/ReportForm";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getReportsFeed, getWorkCategories } from "@/modules/reports/queries";
import { getActiveSites } from "@/modules/sites/queries";

export default async function NewReportPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [sites, reports, categories] = await Promise.all([
    getActiveSites(supabase),
    getReportsFeed(supabase, profile.id),
    getWorkCategories(supabase, profile.company_id),
  ]);

  return (
    <ReportForm
      companyId={profile.company_id}
      sites={sites}
      categories={categories}
      lastReport={reports[0] ?? null}
    />
  );
}
