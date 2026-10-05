import Link from "next/link";
import {
  Bell,
  ChevronRight,
  Info,
  Languages,
  LogOut,
  Building2,
  Users,
} from "lucide-react";

import { BackHeader } from "@/components/layout/ScreenHeader";
import { initialsOf } from "@/components/shared/Thumb";
import { LOCALE_NAMES } from "@/lib/i18n/locales";
import { getLocale, getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/modules/auth/actions";
import { requireProfile } from "@/modules/auth/session";
import { Avatar } from "@/components/ui/avatar";
import { Ticket, TicketBody } from "@/components/ui/ticket";
import { AVATARS_BUCKET } from "@/modules/media/photos";
import { getSignedPhotoUrls } from "@/modules/media/signedUrls";
import { Button } from "@/components/ui/button";

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
  const t = await getT();
  const locale = await getLocale();
  const profile = await requireProfile();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const avatarUrl = profile.avatar_path
    ? ((await getSignedPhotoUrls(supabase, [profile.avatar_path], AVATARS_BUCKET).catch(() => new Map<string, string>())).get(profile.avatar_path) ?? null)
    : null;

  const rows: SettingsRow[] = [
    ...(profile.role === "boss"
      ? [
          { icon: Users, label: t.profile.rows.team, href: "/more/team" },
          { icon: Building2, label: t.companyUi.title, href: "/more/company" },
        ]
      : []),
    { icon: Bell, label: t.profile.rows.notifications, href: "/more/notifications" },
    {
      icon: Languages,
      label: t.profile.rows.language,
      value: LOCALE_NAMES[locale],
      href: "/more/language",
    },
    { icon: Info, label: t.profile.rows.about, href: "/more/about" },
  ];

  return (
    <div className="pb-6">
      <BackHeader title={t.profile.title} href="/" />

      <div className="flex flex-col gap-4 px-4 lg:mx-auto lg:max-w-[480px] lg:px-0">
        <Ticket compact>
          <Avatar
            initials={initialsOf(profile.full_name)}
            src={avatarUrl}
            className="size-auto w-(--ticket-stub) shrink-0 self-stretch rounded-none rounded-l-[9px] border-0 border-r border-dashed border-perf text-[18px]"
          />

          <TicketBody className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold">{profile.full_name}</p>
              {user?.email && (
                <p className="truncate text-[13px] text-ink-2">{user.email}</p>
              )}
            </div>

            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link href="/more/profile">{t.profile.change}</Link>
            </Button>
          </TicketBody>
        </Ticket>

        <Ticket variant="sections">
          {rows.map((row) => (
            <Link
              key={row.href}
              href={row.href}
              className="flex min-h-12 items-center gap-3 px-3.5 outline-none not-first:border-t not-first:border-dashed not-first:border-perf hover:bg-primary-tint focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <row.icon className="size-5 shrink-0 text-ink-2" strokeWidth={1.9} aria-hidden />
              <span className="flex-1 text-[14px] font-medium">{row.label}</span>
              {row.value && <span className="text-[13px] text-ink-2">{row.value}</span>}
              <ChevronRight className="size-4 shrink-0 text-ink-3" strokeWidth={1.9} aria-hidden />
            </Link>
          ))}
        </Ticket>

        <form action={signOut}>
          <Button type="submit" variant="danger" block>
            <LogOut className="size-[18px]" strokeWidth={1.9} aria-hidden />
            {t.auth.signOut}
          </Button>
        </form>
      </div>
    </div>
  );
}
