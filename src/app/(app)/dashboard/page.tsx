import { redirect } from "next/navigation";

import { DashboardScreen } from "@/components/dashboard/DashboardScreen";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getPeriodRange } from "@/modules/dashboard/period";
import { getCompanyEntriesInRange } from "@/modules/entries/queries";
import { getCompanyWorkers } from "@/modules/team/queries";
import { dateKeyOf } from "@/modules/time/calc";

/**
 * Повна сторінка дашборда — тільки для `boss`. Перший кадр (період
 * «Місяць») і «Сьогодні» вантажаються на сервері, зміну періоду далі
 * бере на себе `DashboardScreen` (браузерний клієнт Supabase).
 */
export default async function DashboardPage() {
  const profile = await requireProfile();

  if (profile.role !== "boss") {
    redirect("/");
  }

  const supabase = await createClient();
  const now = new Date();
  const todayKey = dateKeyOf(now);
  const { from, to } = getPeriodRange("month", now);

  const [periodEntries, todayEntries, workers] = await Promise.all([
    getCompanyEntriesInRange(supabase, profile.company_id, dateKeyOf(from), dateKeyOf(to)),
    getCompanyEntriesInRange(supabase, profile.company_id, todayKey, todayKey),
    getCompanyWorkers(supabase, profile.company_id),
  ]);

  return (
    <DashboardScreen
      profile={profile}
      initialPeriodEntries={periodEntries}
      todayEntries={todayEntries}
      activeWorkersCount={workers.length}
    />
  );
}
