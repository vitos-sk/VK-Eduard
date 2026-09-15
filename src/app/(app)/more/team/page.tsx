import { redirect } from "next/navigation";

import { BackHeader } from "@/components/layout/ScreenHeader";
import { TeamManagementScreen } from "@/components/more/TeamManagementScreen";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getCompanyWorkers } from "@/modules/team/queries";

/** Команда компанії — тільки boss: заведення нового співробітника і деактивація наявних. */
export default async function TeamPage() {
  const profile = await requireProfile();

  if (profile.role !== "boss") {
    redirect("/more");
  }

  const supabase = await createClient();
  const workers = await getCompanyWorkers(supabase, profile.company_id);

  return (
    <div className="pb-6">
      <BackHeader title={t.profile.teamPage.title} href="/more" />

      <TeamManagementScreen
        companyId={profile.company_id}
        currentUserId={profile.id}
        initialWorkers={workers}
      />
    </div>
  );
}
