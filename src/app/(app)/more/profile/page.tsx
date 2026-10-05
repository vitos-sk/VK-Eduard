import { BackHeader } from "@/components/layout/ScreenHeader";
import { AvatarUploader } from "@/components/more/AvatarUploader";
import { EditNameForm } from "@/components/more/EditNameForm";
import { initialsOf } from "@/components/shared/Thumb";
import { getT } from "@/lib/i18n/server";
import { requireProfile } from "@/modules/auth/session";
import { AVATARS_BUCKET } from "@/modules/media/photos";
import { getSignedPhotoUrls } from "@/modules/media/signedUrls";
import { createClient } from "@/lib/supabase/server";

export default async function EditProfilePage() {
  const t = await getT();
  const profile = await requireProfile();
  const supabase = await createClient();
  const avatarUrl = profile.avatar_path
    ? ((await getSignedPhotoUrls(supabase, [profile.avatar_path], AVATARS_BUCKET).catch(() => new Map<string, string>())).get(profile.avatar_path) ?? null)
    : null;

  return (
    <div className="pb-6">
      <BackHeader title={t.profile.editTitle} href="/more" />
      <div className="px-4 pb-3.5 lg:mx-auto lg:max-w-[480px] lg:px-0">
        <AvatarUploader
          companyId={profile.company_id}
          userId={profile.id}
          initials={initialsOf(profile.full_name)}
          avatarPath={profile.avatar_path}
          avatarUrl={avatarUrl}
        />
      </div>
      <EditNameForm fullName={profile.full_name} />
    </div>
  );
}
