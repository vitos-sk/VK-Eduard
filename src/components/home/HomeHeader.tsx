import Link from "next/link";
import { Bell } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Шапка главной: логотип «K group.» слева, колокольчик и аватар справа.
 *
 * `initials` — первая буква имени из профиля. Счётчик непрочитанных убран
 * вместе с моком: экрана уведомлений нет, а рисовать выдуманное число
 * рядом с настоящим именем — врать пользователю.
 *
 * Аватар ведёт в профиль, экрана уведомлений пока нет — колокольчик без действия.
 */
export function HomeHeader({
  initials,
  className,
}: {
  initials: string;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-3 pt-[calc(env(safe-area-inset-top)+1.25rem)]",
        className,
      )}
    >
      <Logo size={19} />

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={t.common.notifications}
          className={cn(
            "flex size-11 items-center justify-center rounded-full text-text",
            "transition-colors duration-150 active:bg-surface-2",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          )}
        >
          <Bell className="size-6" strokeWidth={2} aria-hidden />
        </button>

        <Link
          href="/more"
          aria-label={t.common.profile}
          className={cn(
            "flex size-11 items-center justify-center rounded-full border border-border bg-surface-2",
            "text-[15px] font-bold text-text",
            "transition-transform duration-150 active:scale-95",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          )}
        >
          {initials}
        </Link>
      </div>
    </header>
  );
}
