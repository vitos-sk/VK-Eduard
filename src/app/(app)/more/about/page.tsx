import { InfoPage } from "@/components/more/InfoPage";
import { t } from "@/lib/i18n";

export default function AboutPage() {
  return (
    <InfoPage title={t.profile.aboutPage.title}>
      <p>{t.profile.aboutPage.body}</p>
    </InfoPage>
  );
}
