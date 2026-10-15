import { InfoPage } from "@/components/more/InfoPage";
import { ReminderSettings } from "@/components/more/ReminderSettings";
import { getT } from "@/lib/i18n/server";
import { requireProfile } from "@/modules/auth/session";

export default async function NotificationsPage() {
  const t = await getT();
  const profile = await requireProfile();

  return (
    <InfoPage title={t.profile.notificationsPage.title}>
      <p>{t.profile.notificationsPage.body}</p>
      <ReminderSettings
        isBoss={profile.role === "boss"}
        vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
      />
    </InfoPage>
  );
}
