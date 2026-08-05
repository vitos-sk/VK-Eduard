import { Bell } from "lucide-react";

import { t } from "@/lib/i18n";
import { currentUser } from "@/lib/mock/user";
import { cn } from "@/lib/utils";

/**
 * Шапка главной: логотип «K group.» слева,
 * колокольчик со счётчиком непрочитанных и аватар справа.
 *
 * Экранов уведомлений и профиля в этой фазе нет — кнопки без действия.
 */
export function HomeHeader({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-3 pt-[calc(env(safe-area-inset-top)+1.25rem)]",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="flex size-9 items-center justify-center rounded-[10px] bg-brand text-[19px] font-extrabold text-brand-ink"
        >
          K
        </span>
        <span className="text-[19px] font-extrabold tracking-tight">
          {t.common.appName}
          <span className="text-brand">.</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={t.common.notifications}
          className={cn(
            "relative flex size-11 items-center justify-center rounded-full text-text",
            "transition-colors duration-150 active:bg-surface-2",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          )}
        >
          <Bell className="size-6" strokeWidth={2} aria-hidden />
          {currentUser.unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex size-[18px] items-center justify-center rounded-full bg-brand text-[11px] font-bold text-brand-ink">
              {currentUser.unreadCount}
            </span>
          )}
        </button>

        <button
          type="button"
          aria-label={t.common.profile}
          className={cn(
            "flex size-11 items-center justify-center rounded-full border border-border bg-surface-2",
            "text-[15px] font-bold text-text",
            "transition-transform duration-150 active:scale-95",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          )}
        >
          {currentUser.initials}
        </button>
      </div>
    </header>
  );
}
