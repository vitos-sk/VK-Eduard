import { AdminEntriesScreen } from "@/components/more/admin/entries/AdminEntriesScreen";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getPeriodRange } from "@/modules/dashboard/period";
import { getCompanyEntriesInRange } from "@/modules/entries/queries";
import { getAllSites } from "@/modules/sites/queries";
import { getCompanyWorkers } from "@/modules/team/queries";
import { dateKeyOf } from "@/modules/time/calc";

/**
 * `/more/admin/entries` — усі записи часу компанії за обраний місяць,
 * з фільтрами і редагуванням/видаленням прямо з таблиці. Роль перевіряє
 * `layout.tsx`. `getAllSites`, а не `getActiveSites`: об'єкт запису міг
 * бути заархівований відтоді, і зникати з фільтра йому не можна.
 */
export default async function AdminEntriesPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { from, to } = getPeriodRange("month", new Date());

  const [entries, workers, sites] = await Promise.all([
    getCompanyEntriesInRange(supabase, profile.company_id, dateKeyOf(from), dateKeyOf(to)),
    getCompanyWorkers(supabase, profile.company_id),
    getAllSites(supabase),
  ]);

  return (
    <AdminEntriesScreen
      companyId={profile.company_id}
      workers={workers}
      sites={sites}
      initialEntries={entries}
    />
  );
}
