import { redirect } from "next/navigation";

import { BackHeader } from "@/components/layout/ScreenHeader";
import { TeamManagementScreen } from "@/components/more/TeamManagementScreen";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getPeriodRange } from "@/modules/dashboard/period";
import { getCompanyEntriesInRange } from "@/modules/entries/queries";
import { getCompanyWorkers } from "@/modules/team/queries";
import { dateKeyOf } from "@/modules/time/calc";

/**
 * Команда компанії — тільки boss: список з годинами за поточний місяць,
 * заведення нового співробітника, деактивація і денна норма.
 */
export default async function TeamPage() {
  const profile = await requireProfile();

  if (profile.role !== "boss") {
    redirect("/more");
  }

  const supabase = await createClient();
  const { from, to } = getPeriodRange("month", new Date());

  const [workers, entries] = await Promise.all([
    getCompanyWorkers(supabase, profile.company_id),
    getCompanyEntriesInRange(supabase, profile.company_id, dateKeyOf(from), dateKeyOf(to)),
  ]);

  return (
    <div className="pb-6">
      <BackHeader title={t.profile.teamPage.title} href="/more" />

      <TeamManagementScreen
        companyId={profile.company_id}
        currentUserId={profile.id}
        workers={workers}
        entries={entries}
      />
    </div>
  );
}
