import Link from "next/link";

import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface AvatarLinkProps {
  initials: string;
  className?: string;
}

/**
 * Аватар-инициалы 32 px (фон `stub`, рамка `edge`) со ссылкой в «Налаштування» (`/more`) —
 * общий элемент шапки верхнеуровневых экранов: «Налаштування» всегда в одном тапе.
 * Зона нажатия 44 px — через `before`.
 */
export function AvatarLink({ initials, className }: AvatarLinkProps) {
  return (
    <Link
      href="/more"
      aria-label={t.common.profile}
      className={cn(
        "relative grid size-8 shrink-0 place-items-center rounded-md border border-edge bg-stub text-[12px] font-semibold text-text outline-none before:absolute before:top-1/2 before:left-1/2 before:size-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      {initials}
    </Link>
  );
}
