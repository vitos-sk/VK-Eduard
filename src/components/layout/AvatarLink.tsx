import Link from "next/link";

import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
    <Button asChild variant="secondary" size="icon" className={cn("border-border", className)}>
      <Link href="/more" aria-label={t.common.profile}>
        {initials}
      </Link>
    </Button>
  );
}
