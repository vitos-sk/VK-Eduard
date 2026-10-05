import { InfoPage } from "@/components/more/InfoPage";
import { getT } from "@/lib/i18n/server";

export default async function NotificationsPage() {
  const t = await getT();
  return (
    <InfoPage title={t.profile.notificationsPage.title}>
      <p>{t.profile.notificationsPage.body}</p>
    </InfoPage>
  );
}
