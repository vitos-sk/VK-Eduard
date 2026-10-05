import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { AVATARS_BUCKET } from "@/modules/media/photos";
import { getSignedPhotoUrls } from "@/modules/media/signedUrls";

/**
 * Серверный layout: профиль нужен и мобильной, и десктопной ветке
 * (десктопный сайдбар показывает имя/роль и форму выхода). Сама
 * интерактивная оболочка (стейт листа быстрых действий, обе ветки
 * вёрстки) — в `AppShell`.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const avatarUrl = profile.avatar_path
    ? ((await getSignedPhotoUrls(supabase, [profile.avatar_path], AVATARS_BUCKET).catch(() => new Map<string, string>())).get(profile.avatar_path) ?? null)
    : null;

  return (
    <AppShell profile={profile} avatarUrl={avatarUrl}>
      {children}
    </AppShell>
  );
}
