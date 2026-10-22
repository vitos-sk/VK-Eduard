"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Clock, FileText, House } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { FabButton } from "@/components/layout/FabButton";
import type { Dict } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
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
export function getNavItems(t: Dict): readonly NavItem[] {
  return [
    { href: "/", label: t.nav.home, icon: House },
    { href: "/objects", label: t.nav.objects, icon: Building2 },
    { href: "/hours", label: t.nav.hours, icon: Clock },
    { href: "/reports", label: t.nav.reports, icon: FileText },
  ];
}

interface BottomNavProps {
  onFabClick: () => void;
  fabExpanded: boolean;
}

/**
 * Нижний таб-бар (TabBar): высота 52 px, фон `nav` (хаки, темнее бумаги), без линий.
 * Пять пунктов: Головна · Об'єкти · [+] · Години · Звіти.
 * Неактивные — `ink`. Активный — зелёные иконка и подпись 600 и зелёная смужка 3 px под ними, без блока и фона.
 * Кнопка [+] чуть выступает над баром вверх — это задумано.
 * Последний flex-элемент `PhoneFrame` — всегда у его низа.
 *
 * `z-60` — выше подложки нижних листов (z-50): по макету таб-бар
 * остаётся видимым, когда открыт лист быстрых действий.
 */
export function BottomNav({ onFabClick, fabExpanded }: BottomNavProps) {
  const t = useT();
  const pathname = usePathname();
  const navItems = getNavItems(t);
  const leftItems = navItems.slice(0, 2);
  const rightItems = navItems.slice(2);

  return (
    <nav
      aria-label={t.common.appName}
      className="relative z-60 shrink-0 bg-nav pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid min-h-[52px] grid-cols-5 items-start px-1 py-1">
        {leftItems.map((item) => (
          <NavTab key={item.href} item={item} pathname={pathname} />
        ))}

        <div className="-mt-2 flex justify-center">
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
        // Блок 44 px высотой — зона нажатия; у активной вкладки зелёная смужка 3 px под иконкой и подписью.
        "mx-auto flex h-11 w-full max-w-[68px] flex-col items-center justify-center gap-0.5 border-b-[3px] border-transparent text-[11px] leading-[13px] outline-none transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        isActive ? "border-primary font-semibold text-primary" : "font-medium text-ink",
      )}
    >
      <Icon className="size-[22px]" strokeWidth={1.9} aria-hidden />
      <span>{item.label}</span>
    </Link>
  );
}
