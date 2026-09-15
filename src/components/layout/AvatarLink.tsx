import Link from "next/link";

import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface AvatarLinkProps {
  initials: string;
  className?: string;
}

/**
 * Аватар-посилання в «Налаштування» (`/more`) — спільний елемент шапки
 * для всіх верхньорівневих екранів (`HomeHeader`, `ObjectsScreen`,
 * `HoursScreen`, `ReportsScreen`, `DashboardScreen`), щоб «Налаштування»
 * завжди були на відстані одного тапу, а не тільки з головної.
 */
export function AvatarLink({ initials, className }: AvatarLinkProps) {
  return (
    <Link
      href="/more"
      aria-label={t.common.profile}
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2",
        "text-[15px] font-bold text-text",
        "transition-transform duration-150 active:scale-95",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        className,
      )}
    >
      {initials}
    </Link>
  );
}
