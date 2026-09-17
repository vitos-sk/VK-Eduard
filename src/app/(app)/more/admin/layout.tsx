import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { BackHeader } from "@/components/layout/ScreenHeader";
import { AdminNav } from "@/components/more/admin/AdminNav";
import { t } from "@/lib/i18n";
import { requireProfile } from "@/modules/auth/session";

interface AdminLayoutProps {
  children: ReactNode;
}

/**
 * Спільний каркас `/more/admin/*` — тільки `boss`. Шапка й суб-навігація по
 * розділах однакові для всіх сторінок адмінки; кожна сторінка сама відповідає
 * за свої горизонтальні відступи (`px-4 lg:px-0`), бо контентна область
 * `AppShell` на десктопі вже дає `px-8` — тут дублювати не треба.
 */
export default async function AdminLayout({ children }: AdminLayoutProps) {
  const profile = await requireProfile();

  if (profile.role !== "boss") {
    redirect("/more");
  }

  return (
    <div className="flex flex-col gap-4 pb-6 lg:gap-6">
      <BackHeader title={t.admin.panel.title} href="/more" className="lg:hidden" />
      <h1 className="hidden px-0 text-[26px] font-extrabold tracking-tight lg:block">
        {t.admin.panel.title}
      </h1>

      <div className="px-4 lg:px-0">
        <AdminNav />
      </div>

      {children}
    </div>
  );
}
