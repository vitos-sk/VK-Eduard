import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { requireProfile } from "@/modules/auth/session";

/**
 * Десктопна адмін-панель — окремий розділ поза `(app)`-групою, тому
 * `PhoneFrame` тут не застосовується (`app/(app)/layout.tsx`). Доступ —
 * тільки `boss`; RLS однаково відсікла б чужі дані на запитах, але сюди
 * рядового робітника краще не пускати навіть подивитись порожній екран.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();

  if (profile.role !== "boss") {
    redirect("/");
  }

  return <AdminShell profile={profile}>{children}</AdminShell>;
}
