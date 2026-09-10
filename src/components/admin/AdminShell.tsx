"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, MapPin, Monitor, Receipt, Users } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { Toaster } from "@/components/ui/sonner";
import { t } from "@/lib/i18n";
import type { Profile } from "@/modules/auth/session";
import { signOut } from "@/modules/auth/actions";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: t.admin.nav.dashboard, icon: LayoutDashboard },
  { href: "/admin/team", label: t.admin.nav.team, icon: Users },
  { href: "/admin/objects", label: t.admin.nav.objects, icon: MapPin },
  { href: "/admin/reports", label: t.admin.nav.reports, icon: Receipt },
] as const;

interface AdminShellProps {
  profile: Profile;
  children: ReactNode;
}

/**
 * Оболонка десктопної адмін-панелі: сайдбар + контент на всю ширину.
 * На вузьких екранах (`<lg`, 1024px) замість сайдбара й контенту —
 * заглушка `NarrowGate`: цей розділ не адаптований під телефон навмисно
 * (докладніше — `docs/ROADMAP.md`, рішення винести адмінку в окремий розділ,
 * а не робити весь застосунок адаптивним).
 */
export function AdminShell({ profile, children }: AdminShellProps) {
  return (
    <div className="min-h-dvh bg-bg text-text">
      <div className="hidden min-h-dvh lg:flex">
        <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface px-4 py-6">
          <Logo className="px-2" />

          <nav className="mt-8 flex flex-1 flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </nav>

          <div className="mt-4 border-t border-border pt-4">
            <p className="truncate px-2 text-[14px] font-bold">{profile.full_name}</p>
            <p className="px-2 text-[13px] font-medium text-text-muted">
              {t.profile.roleBoss}
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

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1200px] px-8 py-8">{children}</div>
        </main>
      </div>

      <NarrowGate />
      <Toaster position="top-center" />
    </div>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}) {
  const pathname = usePathname();
  const isActive = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "flex h-11 items-center gap-3 rounded-[10px] px-2 text-[14px] font-bold",
        "transition-colors duration-150",
        isActive
          ? "bg-brand text-brand-ink"
          : "text-text-muted hover:bg-surface-2 hover:text-text",
      )}
    >
      <Icon className="size-[18px] shrink-0" strokeWidth={2.2} aria-hidden />
      {label}
    </Link>
  );
}

/** Показывается вместо сайдбара и контента на экранах уже `lg` (телефон, планшет). */
function NarrowGate() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center lg:hidden">
      <Monitor className="size-10 text-text-muted" strokeWidth={1.6} aria-hidden />
      <p className="text-[19px] font-extrabold tracking-tight">
        {t.admin.narrowGate.title}
      </p>
      <p className="max-w-[320px] text-[14px] font-medium text-text-muted">
        {t.admin.narrowGate.hint}
      </p>
      <Link
        href="/"
        className={cn(
          "mt-2 flex h-11 items-center justify-center rounded-[14px] bg-brand px-5",
          "text-[14px] font-bold text-brand-ink",
        )}
      >
        {t.admin.narrowGate.back}
      </Link>
    </div>
  );
}
