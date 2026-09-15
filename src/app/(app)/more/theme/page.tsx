import { InfoPage } from "@/components/more/InfoPage";
import { t } from "@/lib/i18n";

export default function ThemePage() {
  return (
    <InfoPage title={t.profile.themePage.title}>
      <p>{t.profile.themePage.body}</p>
    </InfoPage>
  );
}
