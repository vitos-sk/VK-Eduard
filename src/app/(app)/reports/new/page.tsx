import { ReportForm } from "@/components/reports/ReportForm";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getReportsFeed } from "@/modules/reports/queries";
import { getSitePhotoUrls } from "@/modules/sites/photoUrls";
import { getActiveSites } from "@/modules/sites/queries";

export default async function NewReportPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [sites, reports] = await Promise.all([
    getActiveSites(supabase),
    getReportsFeed(supabase, profile.id),
  ]);
  const sitePhotoUrls = await getSitePhotoUrls(supabase, sites);

  return (
    <ReportForm
      userId={profile.id}
      companyId={profile.company_id}
      sites={sites}
      sitePhotoUrls={sitePhotoUrls}
      lastReport={reports[0] ?? null}
    />
  );
}
