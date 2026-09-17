import { AdminSalaryScreen } from "@/components/more/admin/salary/AdminSalaryScreen";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getPeriodRange } from "@/modules/dashboard/period";
import { getCompanyEntriesInRange } from "@/modules/entries/queries";
import { dateKeyOf } from "@/modules/time/calc";

/** Розділ «Зарплата» адмінки — тільки `boss`. Роль перевіряє `layout.tsx`. */
export default async function AdminSalaryPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { from, to } = getPeriodRange("month", new Date());

  const entries = await getCompanyEntriesInRange(
    supabase,
    profile.company_id,
    dateKeyOf(from),
    dateKeyOf(to),
  );

  return <AdminSalaryScreen profile={profile} initialEntries={entries} />;
}
