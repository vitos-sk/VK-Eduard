import Link from "next/link";
import { LayoutDashboard, LogOut } from "lucide-react";

import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { fmt } from "@/lib/format";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/modules/auth/actions";
import { requireProfile } from "@/modules/auth/session";

/**
 * Профиль и выход. Заводить людей и объекты отсюда будет шеф — это этап 6,
 * сейчас экран отвечает ровно на два вопроса: под кем я вошёл и как выйти.
 */
export default async function MorePage() {
  const profile = await requireProfile();

  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", profile.company_id)
    .maybeSingle();

  const rows = [
    { label: t.profile.company, value: company?.name ?? t.common.dash },
    {
      label: t.profile.norm,
      value: fmt(t.profile.normValue, {
        hours: Math.round(profile.daily_norm_minutes / 60),
      }),
    },
  ];

  return (
    <div className="pb-6">
      <ScreenHeader title={t.profile.title} />

      <div className="mx-4 rounded-[18px] border border-border bg-surface-2 p-5">
        <p className="text-[22px] font-extrabold tracking-tight">
          {profile.full_name}
        </p>
        <p className="mt-1 text-[15px] font-semibold text-text-muted">
          {profile.role === "boss" ? t.profile.roleBoss : t.profile.roleWorker}
        </p>

        <dl className="mt-5 flex flex-col gap-3">
          {rows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-4">
              <dt className="text-[15px] font-medium text-text-muted">{row.label}</dt>
              <dd className="text-[15px] font-bold">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {profile.role === "boss" && (
        <Link
          href="/admin"
          className="mx-4 mt-6 flex h-14 items-center justify-center gap-2 rounded-[14px] border border-border text-[17px] font-bold text-text transition-transform duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <LayoutDashboard className="size-5" strokeWidth={2} aria-hidden />
          {t.admin.openLink}
        </Link>
      )}

      <form action={signOut} className="mx-4 mt-3">
        <button
          type="submit"
          className="flex h-14 w-full items-center justify-center gap-2 rounded-[14px] border border-border text-[17px] font-bold text-danger transition-transform duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <LogOut className="size-5" strokeWidth={2} aria-hidden />
          {t.auth.signOut}
        </button>
      </form>
    </div>
  );
}
