import { InfoPage } from "@/components/more/InfoPage";
import { t } from "@/lib/i18n";

export default function LanguagePage() {
  return (
    <InfoPage title={t.profile.languagePage.title}>
      <p>{t.profile.languagePage.body}</p>
    </InfoPage>
  );
}
