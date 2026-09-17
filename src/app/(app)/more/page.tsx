import Link from "next/link";
import {
  Bell,
  ChevronRight,
  Info,
  Languages,
  LogOut,
  ShieldCheck,
  Users,
} from "lucide-react";

import { BackHeader } from "@/components/layout/ScreenHeader";
import { initialsOf } from "@/components/shared/Thumb";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/modules/auth/actions";
import { requireProfile } from "@/modules/auth/session";
import { cn } from "@/lib/utils";

interface SettingsRow {
  icon: typeof Bell;
  label: string;
  value?: string;
  href: string;
}

/**
 * Налаштування: профіль (ім'я, email, зміна імені), службові підрозділи
 * та вихід. Компанію/норму, які раніше жили тут окремим блоком, прибрали —
 * дублювали інформацію з `/dashboard` і в макет «Налаштувань» не лягали;
 * лишились тільки речі, що стосуються самого акаунта.
 */
export default async function MorePage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rows: SettingsRow[] = [
    ...(profile.role === "boss"
      ? [
          { icon: Users, label: t.profile.rows.team, href: "/more/team" },
          { icon: ShieldCheck, label: t.profile.rows.admin, href: "/more/admin" },
        ]
      : []),
    { icon: Bell, label: t.profile.rows.notifications, href: "/more/notifications" },
    {
      icon: Languages,
      label: t.profile.rows.language,
      value: t.profile.rows.languageValue,
      href: "/more/language",
    },
    { icon: Info, label: t.profile.rows.about, href: "/more/about" },
  ];

  return (
    <div className="pb-6">
      <BackHeader title={t.profile.title} href="/" />

      <div className="flex flex-col gap-6 px-4 lg:mx-auto lg:max-w-[480px]">
        <div className="flex items-center gap-3 rounded-[16px] border border-border bg-surface-2 p-4">
          <div
            aria-hidden
            style={{ backgroundColor: `hsl(${profile.avatar_hue} 45% 26%)` }}
            className="flex size-14 shrink-0 items-center justify-center rounded-full text-[17px] font-extrabold text-white"
          >
            {initialsOf(profile.full_name)}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-bold">{profile.full_name}</p>
            {user?.email && (
              <p className="truncate text-[13px] font-medium text-text-muted">
                {user.email}
              </p>
            )}
          </div>

          <Link
            href="/more/profile"
            className={cn(
              "shrink-0 rounded-full border border-brand/40 px-3 py-1.5",
              "text-[13px] font-bold text-brand",
              "transition-transform duration-150 active:scale-[0.96]",
            )}
          >
            {t.profile.change}
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <Link
              key={row.href}
              href={row.href}
              className={cn(
                "flex h-14 items-center gap-3 rounded-[14px] border border-border bg-surface-2 px-4",
                "transition-transform duration-150 active:scale-[0.98]",
              )}
            >
              <row.icon className="size-5 shrink-0 text-text-muted" strokeWidth={2} aria-hidden />
              <span className="flex-1 text-[15px] font-bold">{row.label}</span>
              {row.value && (
                <span className="text-[14px] font-medium text-text-muted">{row.value}</span>
              )}
              <ChevronRight className="size-[18px] shrink-0 text-text-dim" strokeWidth={2.4} aria-hidden />
            </Link>
          ))}
        </div>

        <form action={signOut}>
          <button
            type="submit"
            className={cn(
              "flex h-14 w-full items-center justify-center gap-2 rounded-[14px]",
              "border border-danger/40 text-[15px] font-bold text-danger",
              "transition-transform duration-150 active:scale-[0.98]",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
            )}
          >
            <LogOut className="size-5" strokeWidth={2} aria-hidden />
            {t.auth.signOut}
          </button>
        </form>
      </div>
    </div>
  );
}
