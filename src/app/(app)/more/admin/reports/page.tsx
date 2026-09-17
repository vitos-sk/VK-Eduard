import { endOfMonth, startOfMonth } from "date-fns";

import { AdminReportsScreen } from "@/components/more/admin/reports/AdminReportsScreen";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getCompanyReportsInRange, getWorkCategories } from "@/modules/reports/queries";
import { getAllSites } from "@/modules/sites/queries";
import { getCompanyWorkers } from "@/modules/team/queries";
import { dateKeyOf } from "@/modules/time/calc";

/**
 * Розділ «Звіти» адмінки (`/more/admin/reports`) — тільки `boss`. Компанійський
 * огляд звітів за період: перший кадр (поточний місяць) з сервера, зміна
 * місяця/фільтрів тягне дані з браузера — та сама схема, що й `AdminScreen`.
 * Роль перевіряє `layout.tsx`.
 */
export default async function AdminReportsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const now = new Date();
  const from = dateKeyOf(startOfMonth(now));
  const to = dateKeyOf(endOfMonth(now));

  const [reports, categories, sites, workers] = await Promise.all([
    getCompanyReportsInRange(supabase, profile.company_id, from, to),
    getWorkCategories(supabase, profile.company_id),
    getAllSites(supabase),
    getCompanyWorkers(supabase, profile.company_id),
  ]);

  return (
    <AdminReportsScreen
      profile={profile}
      initialReports={reports}
      categories={categories}
      sites={sites}
      workers={workers}
    />
  );
}
