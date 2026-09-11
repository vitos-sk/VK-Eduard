import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { requireProfile } from "@/modules/auth/session";

/**
 * Серверный layout: профиль нужен и мобильной, и десктопной ветке
 * (десктопный сайдбар показывает имя/роль и форму выхода). Сама
 * интерактивная оболочка (стейт листа быстрых действий, обе ветки
 * вёрстки) — в `AppShell`.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();

  return <AppShell profile={profile}>{children}</AppShell>;
}
