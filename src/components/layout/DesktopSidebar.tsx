"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Plus } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { NAV_ITEMS } from "@/components/layout/BottomNav";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Profile } from "@/modules/auth/session";
import { signOut } from "@/modules/auth/actions";

interface DesktopSidebarProps {
  profile: Profile;
  onFabClick: () => void;
}

/**
 * Десктопный сайдбар (`lg:` и шире) — параллель мобильному `BottomNav`,
 * по образцу `AdminShell.tsx`. Мобильную вёрстку не трогает: показывается
 * только внутри `hidden lg:flex`-ветки `(app)/layout.tsx`.
 */
export function DesktopSidebar({ profile, onFabClick }: DesktopSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 lg:flex">
      <Logo className="px-2" />

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-[10px] px-2 text-[14px] font-bold",
                "transition-colors duration-150",
                isActive
                  ? "bg-brand text-brand-ink"
                  : "text-text-muted hover:bg-surface-2 hover:text-text",
              )}
            >
              <Icon className="size-[18px] shrink-0" strokeWidth={2.2} aria-hidden />
              {item.label}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onFabClick}
          className={cn(
            "mt-2 flex h-11 items-center gap-3 rounded-[10px] px-2 text-[14px] font-bold",
            "text-brand transition-colors duration-150 hover:bg-surface-2",
          )}
        >
          <Plus className="size-[18px] shrink-0" strokeWidth={2.2} aria-hidden />
          {t.nav.add}
        </button>
      </nav>

      <div className="mt-4 border-t border-border pt-4">
        <p className="truncate px-2 text-[14px] font-bold">{profile.full_name}</p>
        <p className="px-2 text-[13px] font-medium text-text-muted">
          {profile.role === "boss" ? t.profile.roleBoss : t.profile.roleWorker}
        </p>

        <form action={signOut} className="mt-3">
          <button
            type="submit"
            className={cn(
              "flex h-10 w-full items-center gap-2 rounded-[10px] px-2",
              "text-[14px] font-semibold text-text-muted",
              "transition-colors duration-150 hover:bg-surface-2 hover:text-danger",
            )}
          >
            <LogOut className="size-[18px]" strokeWidth={2} aria-hidden />
            {t.auth.signOut}
          </button>
        </form>
      </div>
    </aside>
  );
}
