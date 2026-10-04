"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, Settings } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { NAV_ITEMS } from "@/components/layout/BottomNav";
import { useOwnAvatarUrl } from "@/components/layout/OwnAvatar";
import { initialsOf } from "@/components/shared/Thumb";
import { Avatar } from "@/components/ui/avatar";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Profile } from "@/modules/auth/profile";
import { signOut } from "@/modules/auth/actions";
import { Button } from "@/components/ui/button";

interface DesktopSidebarProps {
  profile: Profile;
}

/**
 * Десктопная боковая панель (`lg:` и шире): 232 px, с подписями.
 * Активный пункт — талон (`ticket` с рамкой) и жёлтая риска слева.
 * Справа от панели вертикальная перфорация — пунктир `perf`.
 */
export function DesktopSidebar({ profile }: DesktopSidebarProps) {
  const pathname = usePathname();
  const avatarUrl = useOwnAvatarUrl();

  const items = [
    ...NAV_ITEMS,
    ...(profile.role === "boss"
      ? [{ href: "/dashboard", label: t.nav.dashboard, icon: LayoutDashboard }]
      : []),
  ];

  return (
    <aside className="hidden w-[232px] shrink-0 flex-col border-r border-dashed border-perf bg-paper px-3 py-5 lg:flex">
      <Logo className="px-2" />

      <nav className="mt-6 flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex h-10 items-center gap-3 rounded-ctl border px-3 text-[14px] outline-none transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                isActive
                  ? "border-edge bg-ticket font-semibold text-primary"
                  : "border-transparent font-medium text-ink-2 hover:bg-primary-tint",
              )}
            >
              {isActive && (
                <span aria-hidden className="absolute top-2 bottom-2 -left-px w-0.5 bg-yellow" />
              )}
              <Icon className="size-5 shrink-0" strokeWidth={1.9} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="perf-t mt-4 pt-4">
        <div className="flex items-center gap-2.5 px-1">
          <Avatar initials={initialsOf(profile.full_name)} src={avatarUrl} />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-medium">{profile.full_name}</p>
            <p className="text-[12px] text-ink-2">
              {profile.role === "boss" ? t.profile.roleBoss : t.profile.roleWorker}
            </p>
          </div>
        </div>

        <Link
          href="/more"
          aria-current={pathname.startsWith("/more") ? "page" : undefined}
          className={cn(
            "mt-3 flex h-9 items-center gap-3 rounded-ctl px-2 text-[14px] font-medium text-ink-2 outline-none hover:bg-primary-tint focus-visible:outline-2 focus-visible:outline-ring",
            pathname.startsWith("/more") && "bg-ticket text-primary",
          )}
        >
          <Settings className="size-[18px]" strokeWidth={1.9} aria-hidden />
          {t.profile.title}
        </Link>

        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            block
            className="mt-0.5 h-9 justify-start gap-3 px-2 font-medium text-ink-2 hover:text-err"
          >
            <LogOut className="size-[18px]" strokeWidth={1.9} aria-hidden />
            {t.auth.signOut}
          </Button>
        </form>
      </div>
    </aside>
  );
}
