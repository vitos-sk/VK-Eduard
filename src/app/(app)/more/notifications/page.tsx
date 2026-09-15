import { InfoPage } from "@/components/more/InfoPage";
import { t } from "@/lib/i18n";

export default function NotificationsPage() {
  return (
    <InfoPage title={t.profile.notificationsPage.title}>
      <p>{t.profile.notificationsPage.body}</p>
    </InfoPage>
  );
}
