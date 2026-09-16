import { redirect } from "next/navigation";

import { BackHeader } from "@/components/layout/ScreenHeader";
import { AdminScreen } from "@/components/more/AdminScreen";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getPeriodRange } from "@/modules/dashboard/period";
import { getCompanyEntriesInRange } from "@/modules/entries/queries";
import { getCompanyWorkers } from "@/modules/team/queries";
import { dateKeyOf } from "@/modules/time/calc";

/** Адмінка — тільки `boss`: фільтри, список-графік годин, експорт і WhatsApp-шеринг. */
export default async function AdminPage() {
  const profile = await requireProfile();

  if (profile.role !== "boss") {
    redirect("/more");
  }

  const supabase = await createClient();
  const { from, to } = getPeriodRange("month", new Date());

  const [entries, workers] = await Promise.all([
    getCompanyEntriesInRange(supabase, profile.company_id, dateKeyOf(from), dateKeyOf(to)),
    getCompanyWorkers(supabase, profile.company_id),
  ]);

  return (
    <div className="pb-6">
      <BackHeader title={t.admin.panel.title} href="/more" />
      <AdminScreen profile={profile} workers={workers} initialEntries={entries} />
    </div>
  );
}
