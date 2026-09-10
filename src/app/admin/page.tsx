import { endOfMonth, startOfMonth } from "date-fns";

import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getCompanyEntriesInRange } from "@/modules/entries/queries";
import { getActiveSites } from "@/modules/sites/queries";
import { getCompanyWorkers } from "@/modules/team/queries";
import { dateKeyOf } from "@/modules/time/calc";

/** Дашборд `/admin` — зведені цифри по компанії за поточний місяць. */
export default async function AdminDashboardPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const now = new Date();
  const from = dateKeyOf(startOfMonth(now));
  const to = dateKeyOf(endOfMonth(now));

  const [entries, workers, activeSites] = await Promise.all([
    getCompanyEntriesInRange(supabase, profile.company_id, from, to),
    getCompanyWorkers(supabase, profile.company_id),
    getActiveSites(supabase),
  ]);

  return (
    <AdminDashboard
      month={now}
      entries={entries}
      workersCount={workers.length}
      activeObjectsCount={activeSites.length}
    />
  );
}
