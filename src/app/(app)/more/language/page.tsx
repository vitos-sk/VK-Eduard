import { InfoPage } from "@/components/more/InfoPage";
import { LanguagePicker } from "@/components/more/LanguagePicker";
import { getT } from "@/lib/i18n/server";

export default async function LanguagePage() {
  const t = await getT();

  return (
    <InfoPage title={t.profile.languagePage.title}>
      <p>{t.profile.languagePage.body}</p>
      <LanguagePicker />
    </InfoPage>
  );
}
