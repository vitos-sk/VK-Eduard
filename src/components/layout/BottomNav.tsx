"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Clock, FileText, House } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { FabButton } from "@/components/layout/FabButton";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Единый источник пунктов навигации — таб-бар (мобильный) и сайдбар
 * (десктопный, `DesktopSidebar`) рендерят один и тот же список, чтобы
 * порядок/тексты/иконки не разъезжались между вёрстками.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: t.nav.home, icon: House },
  { href: "/objects", label: t.nav.objects, icon: Building2 },
  { href: "/hours", label: t.nav.hours, icon: Clock },
  { href: "/reports", label: t.nav.reports, icon: FileText },
];

const leftItems = NAV_ITEMS.slice(0, 2);
const rightItems = NAV_ITEMS.slice(2);

interface BottomNavProps {
  onFabClick: () => void;
  fabExpanded: boolean;
}

/**
 * Нижний таб-бар (TabBar): высота 84 px, фон `ticket`, сверху пунктир.
 * Пять пунктов: Головна · Об'єкти · [+] · Години · Звіти.
 * Активный — зелёный, подпись 600, над иконкой жёлтая риска 16×2.
 * Последний flex-элемент `PhoneFrame` — всегда у его низа.
 *
 * `z-60` — выше подложки нижних листов (z-50): по макету таб-бар
 * остаётся видимым, когда открыт лист быстрых действий.
 */
export function BottomNav({ onFabClick, fabExpanded }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={t.common.appName}
      className="perf-t relative z-60 shrink-0 bg-ticket pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid min-h-[84px] grid-cols-5 items-start px-1 pt-2.5">
        {leftItems.map((item) => (
          <NavTab key={item.href} item={item} pathname={pathname} />
        ))}

        <div className="flex justify-center">
          <FabButton onClick={onFabClick} expanded={fabExpanded} />
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
        // зона нажатия ≥44 px: ссылка на всю ширину ячейки и 44+ по высоте
        "relative flex min-h-11 flex-col items-center gap-1 text-[11px] outline-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        isActive ? "font-semibold text-primary" : "font-medium text-ink-2",
      )}
    >
      {isActive && (
        <span aria-hidden className="absolute -top-2.5 left-1/2 h-0.5 w-4 -translate-x-1/2 bg-yellow" />
      )}
      <Icon className="size-[22px]" strokeWidth={1.9} aria-hidden />
      <span>{item.label}</span>
    </Link>
  );
}
