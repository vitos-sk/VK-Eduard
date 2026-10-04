"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { usePhotoSources } from "@/components/shared/PhotoSourceInputs";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Ticket } from "@/components/ui/ticket";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { AVATARS_BUCKET, deleteAvatar, uploadAvatar } from "@/modules/media/photos";

interface AvatarUploaderProps {
  companyId: string;
  userId: string;
  initials: string;
  avatarPath: string | null;
  avatarUrl: string | null;
}

/** Своё фото профиля: сфотографироваться (селфи) или выбрать из галереи, можно удалить. */
export function AvatarUploader({
  companyId,
  userId,
  initials,
  avatarPath,
  avatarUrl,
}: AvatarUploaderProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [path, setPath] = useState(avatarPath);
  const [url, setUrl] = useState(avatarUrl);
  const [isBusy, setIsBusy] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    setIsBusy(true);
    const previousPath = path;

    try {
      const newPath = await uploadAvatar(supabase, { companyId, userId }, file);
      const { data } = await supabase.storage.from(AVATARS_BUCKET).createSignedUrl(newPath, 3600);

      setPath(newPath);
      setUrl(data?.signedUrl ?? null);

      if (previousPath) {
        await supabase.storage.from(AVATARS_BUCKET).remove([previousPath]);
      }

      router.refresh();
    } catch {
      toast(t.profile.avatarUploadError);
    } finally {
      setIsBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!path) return;

    setIsBusy(true);

    try {
      await deleteAvatar(supabase, userId, path);
      setPath(null);
      setUrl(null);
      router.refresh();
    } catch {
      toast(t.profile.avatarRemoveError);
    } finally {
      setIsBusy(false);
    }
  };

  const { inputs, openCamera, openGallery } = usePhotoSources(
    (files) => void handleFile(files[0]),
    false,
    "user",
  );

  return (
    <Ticket variant="flat" className="flex items-center gap-4">
      <Avatar initials={initials} src={url} className="size-20 rounded-card text-[24px]" />

      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium">
          {isBusy ? t.profile.avatarUploading : t.profile.avatarTitle}
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={openCamera} disabled={isBusy}>
            <Camera className="size-4" strokeWidth={1.9} aria-hidden />
            {t.profile.avatarTake}
          </Button>
          <Button variant="outline" size="sm" onClick={openGallery} disabled={isBusy}>
            <ImagePlus className="size-4" strokeWidth={1.9} aria-hidden />
            {t.profile.avatarGallery}
          </Button>
          {path && (
            <Button variant="danger" size="sm" onClick={handleRemove} disabled={isBusy}>
              <Trash2 className="size-4" strokeWidth={1.9} aria-hidden />
              {t.profile.avatarRemove}
            </Button>
          )}
        </div>
      </div>

      {inputs}
    </Ticket>
  );
}
