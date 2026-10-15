import { InfoPage } from "@/components/more/InfoPage";
import { NotificationKinds } from "@/components/more/NotificationKinds";
import { ReminderSettings } from "@/components/more/ReminderSettings";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { DEFAULT_PREFS } from "@/modules/notifications/prefs";
import { getMyPrefs } from "@/modules/notifications/queries";

export default async function NotificationsPage() {
  const t = await getT();
  const profile = await requireProfile();
  const supabase = await createClient();
  // Страница не должна падать, если миграция с настройками ещё не применена: тогда всё включено, как и было.
  const prefs = await getMyPrefs(supabase, profile.id).catch(() => DEFAULT_PREFS);

  return (
    <InfoPage title={t.profile.notificationsPage.title}>
      <p>{t.profile.notificationsPage.body}</p>
      <ReminderSettings vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
      <NotificationKinds initial={prefs} />
    </InfoPage>
  );
}
