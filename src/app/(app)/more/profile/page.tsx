import { BackHeader } from "@/components/layout/ScreenHeader";
import { EditNameForm } from "@/components/more/EditNameForm";
import { t } from "@/lib/i18n";
import { requireProfile } from "@/modules/auth/session";

export default async function EditProfilePage() {
  const profile = await requireProfile();

  return (
    <div className="pb-6">
      <BackHeader title={t.profile.editTitle} href="/more" />
      <EditNameForm fullName={profile.full_name} />
    </div>
  );
}
