import { AdminTeamScreen } from "@/components/more/admin/team/AdminTeamScreen";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getPeriodRange } from "@/modules/dashboard/period";
import { getCompanyEntriesInRange } from "@/modules/entries/queries";
import { getCompanyWorkers } from "@/modules/team/queries";
import { dateKeyOf } from "@/modules/time/calc";

/**
 * Розділ «Команда» адмінки — тільки boss: список активних співробітників
 * з годинами за поточний місяць, заведення нового, деактивація і денна
 * норма. Роль перевіряє спільний `layout.tsx`.
 */
export default async function AdminTeamPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { from, to } = getPeriodRange("month", new Date());

  const [workers, entries] = await Promise.all([
    getCompanyWorkers(supabase, profile.company_id),
    getCompanyEntriesInRange(supabase, profile.company_id, dateKeyOf(from), dateKeyOf(to)),
  ]);

  return <AdminTeamScreen profile={profile} workers={workers} entries={entries} />;
}
