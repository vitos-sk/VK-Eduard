import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { t } from "@/lib/i18n";

export default function HomePage() {
  return <ScreenHeader title={t.nav.home} />;
}
