import { endOfMonth, startOfMonth } from "date-fns";

import { AdminSitesScreen } from "@/components/more/admin/sites/AdminSitesScreen";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getCompanyEntriesInRange } from "@/modules/entries/queries";
import { getAllSites } from "@/modules/sites/queries";
import { dateKeyOf } from "@/modules/time/calc";

/**
 * `/more/admin/sites` — адміністративний (агрегуючий) погляд на об'єкти
 * компанії: роль уже перевірена в `AdminLayout`, тут тільки дані. Перший
 * кадр (поточний місяць) рахуємо на сервері, зміну місяця — на клієнті,
 * та сама схема, що й `AdminScreen`/`getCompanyEntriesInRange`.
 */
export default async function AdminSitesPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const now = new Date();
  const from = dateKeyOf(startOfMonth(now));
  const to = dateKeyOf(endOfMonth(now));

  const [sites, entries] = await Promise.all([
    getAllSites(supabase),
    getCompanyEntriesInRange(supabase, profile.company_id, from, to),
  ]);

  return <AdminSitesScreen companyId={profile.company_id} sites={sites} initialEntries={entries} />;
}
