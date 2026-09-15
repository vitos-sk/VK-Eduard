import { InfoPage } from "@/components/more/InfoPage";
import { t } from "@/lib/i18n";

export default function HelpPage() {
  return (
    <InfoPage title={t.profile.helpPage.title}>
      <p>{t.profile.helpPage.body}</p>
    </InfoPage>
  );
}
