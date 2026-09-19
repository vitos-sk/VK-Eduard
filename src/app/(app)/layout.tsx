import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getOpenEntry } from "@/modules/entries/queries";

/**
 * Серверный layout: профиль нужен и мобильной, и десктопной ветке
 * (десктопный сайдбар показывает имя/роль и форму выхода). Сама
 * интерактивная оболочка (стейт листа быстрых действий, обе ветки
 * вёрстки) — в `AppShell`.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const openEntry = await getOpenEntry(supabase, profile.id);

  return (
    <AppShell profile={profile} openEntry={openEntry}>
      {children}
    </AppShell>
  );
}
