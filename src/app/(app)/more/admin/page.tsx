import { AdminScreen } from "@/components/more/AdminScreen";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getPeriodRange } from "@/modules/dashboard/period";
import { getCompanyEntriesInRange } from "@/modules/entries/queries";
import { getCompanyWorkers } from "@/modules/team/queries";
import { dateKeyOf } from "@/modules/time/calc";

/** Огляд адмінки — тільки `boss`: KPI, список-графік годин, експорт і WhatsApp-шеринг. Роль перевіряє `layout.tsx`. */
export default async function AdminPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { from, to } = getPeriodRange("month", new Date());

  const [entries, workers] = await Promise.all([
    getCompanyEntriesInRange(supabase, profile.company_id, dateKeyOf(from), dateKeyOf(to)),
    getCompanyWorkers(supabase, profile.company_id),
  ]);

  return <AdminScreen profile={profile} workers={workers} initialEntries={entries} />;
}
