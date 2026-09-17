"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const ADMIN_SECTIONS = [
  { href: "/more/admin", label: t.admin.nav.overview },
  { href: "/more/admin/team", label: t.admin.nav.team },
  { href: "/more/admin/sites", label: t.admin.nav.sites },
  { href: "/more/admin/entries", label: t.admin.nav.entries },
  { href: "/more/admin/reports", label: t.admin.nav.reports },
  { href: "/more/admin/salary", label: t.admin.nav.salary },
  { href: "/more/admin/settings", label: t.admin.nav.settings },
] as const;

/**
 * Суб-навігація розділів адмінки. Той самий рядок пілюль і на мобільному
 * (горизонтальний скрол під `BackHeader`), і на десктопі (без обмеження
 * ширини — контентна область `AppShell` уже широка сама по собі).
 */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label={t.admin.panel.title}
      className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0"
    >
      {ADMIN_SECTIONS.map((section) => {
        const isActive =
          section.href === "/more/admin"
            ? pathname === "/more/admin"
            : pathname.startsWith(section.href);

        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex h-9 shrink-0 items-center whitespace-nowrap rounded-full px-3.5 text-[14px] font-bold",
              "transition-colors duration-150",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              isActive
                ? "bg-brand text-brand-ink"
                : "bg-surface-2 text-text-muted hover:text-text",
            )}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
