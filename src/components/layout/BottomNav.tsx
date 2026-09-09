"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Clock, FileText, House } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { FabButton } from "@/components/layout/FabButton";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const leftItems: readonly NavItem[] = [
  { href: "/", label: t.nav.home, icon: House },
  { href: "/objects", label: t.nav.objects, icon: Building2 },
];

const rightItems: readonly NavItem[] = [
  { href: "/hours", label: t.nav.hours, icon: Clock },
  { href: "/reports", label: t.nav.reports, icon: FileText },
];

interface BottomNavProps {
  onFabClick: () => void;
  fabExpanded: boolean;
}

/**
 * Нижний таб-бар: 4 вкладки и FAB по центру.
 * Прижат к низу `PhoneFrame`, а не к окну браузера.
 *
 * `z-60` — выше подложки нижних листов (z-50): по макету таб-бар
 * остаётся видимым, когда открыт лист быстрых действий.
 */
export function BottomNav({ onFabClick, fabExpanded }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={t.common.appName}
      className="absolute inset-x-0 bottom-0 z-60 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex h-[68px] items-stretch">
        {leftItems.map((item) => (
          <NavTab key={item.href} item={item} pathname={pathname} />
        ))}

        <div className="relative flex w-[76px] shrink-0 justify-center">
          <FabButton
            onClick={onFabClick}
            expanded={fabExpanded}
            className="absolute -top-[18px]"
          />
        </div>

        {rightItems.map((item) => (
          <NavTab key={item.href} item={item} pathname={pathname} />
        ))}
      </div>
    </nav>
  );
}

function NavTab({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive =
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-1 pt-1",
        "transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
        isActive ? "text-brand" : "text-text-dim",
      )}
    >
      <Icon className="size-6" strokeWidth={isActive ? 2.4 : 2} aria-hidden />
      <span className="text-[11px] font-semibold">{item.label}</span>
    </Link>
  );
}
