"use client";

import Link from "next/link";

import { useOwnAvatarUrl } from "@/components/layout/OwnAvatar";
import { Avatar } from "@/components/ui/avatar";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

interface AvatarLinkProps {
  initials: string;
  className?: string;
}

/**
 * Аватар 32 px со ссылкой в «Налаштування» (`/more`) — общий элемент шапки верхнеуровневых
 * экранов. Показывает своё фото, если оно загружено, иначе инициалы.
 * Зона нажатия 44 px — через `before`.
 */
export function AvatarLink({ initials, className }: AvatarLinkProps) {
  const t = useT();
  const url = useOwnAvatarUrl();

  return (
    <Link
      href="/more"
      aria-label={t.common.profile}
      className={cn(
        "relative shrink-0 rounded-md outline-none before:absolute before:top-1/2 before:left-1/2 before:size-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      <Avatar initials={initials} src={url} />
    </Link>
  );
}
