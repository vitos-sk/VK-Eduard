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
 * Активный — зелёная иконка и подпись 600 на светлой «таблетке» `ticket` 56×28 под иконкой.
 * Кнопка [+] на 10 px выше иконок и чуть выступает над баром — это задумано.
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
      className="perf-t z-60 shrink-0 bg-nav pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid min-h-[52px] grid-cols-5 items-start px-1 pt-1">
        {leftItems.map((item) => (
          <NavTab key={item.href} item={item} pathname={pathname} />
        ))}

        <div className="-mt-2.5 flex justify-center">
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
        "relative flex min-h-11 flex-col items-center gap-0.5 text-[11px] leading-[13px] outline-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        // На хаки неактивное — `ink` (контраст 10:1; `ink-2` здесь ниже AA для 11 px).
        isActive ? "font-semibold text-primary" : "font-medium text-ink",
      )}
    >
      {/* Подсветка активной вкладки: светлая «таблетка» под иконкой, как талон на хаки. */}
      <span
        aria-hidden
        className={cn("grid h-7 w-14 place-items-center rounded-full transition-colors duration-150", isActive && "perf-t")}
      >
        <Icon className="size-[22px]" strokeWidth={1.9} aria-hidden />
      </span>
      <span>{item.label}</span>
    </Link>
  );
}
