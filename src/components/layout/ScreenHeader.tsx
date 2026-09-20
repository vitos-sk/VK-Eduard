import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ScreenHeaderProps {
  title: string;
  /** Кнопка справа: «+», иконка календаря и т.п. */
  action?: ReactNode;
  className?: string;
  /** Переопределение размера заголовка, например когда рядом много контента. */
  titleClassName?: string;
}

/**
 * Шапка вкладки: крупный заголовок слева, необязательное действие справа.
 * Учитывает верхнюю безопасную зону.
 */
export function ScreenHeader({ title, action, className, titleClassName }: ScreenHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-3 px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-4",
        className,
      )}
    >
      <h1
        className={cn(
          "shrink-0 text-[30px] font-extrabold tracking-tight",
          titleClassName,
        )}
      >
        {title}
      </h1>
      <div className="min-w-0">{action}</div>
    </header>
  );
}

interface BackHeaderProps {
  title: string;
  /** Куда ведёт стрелка «‹». Не задан — стрелка вызывает `onBack`. */
  href?: string;
  /** Возврат на предыдущий экран вместо перехода по ссылке. */
  onBack?: () => void;
  action?: ReactNode;
  className?: string;
}

/** Компактная шапка вложенной страницы: стрелка назад, заголовок по центру. */
export function BackHeader({
  title,
  href,
  onBack,
  action,
  className,
}: BackHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center gap-2 px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4",
        className,
      )}
    >
      {href ? (
        <Button asChild variant="ghost" size="icon" className="-ml-2">
          <Link href={href} aria-label={t.common.back}>
            <ChevronLeft className="size-6" strokeWidth={2.4} aria-hidden />
          </Link>
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="-ml-2"
          onClick={onBack}
          aria-label={t.common.back}
        >
          <ChevronLeft className="size-6" strokeWidth={2.4} aria-hidden />
        </Button>
      )}

      <h1 className="flex-1 text-center text-[17px] font-bold">{title}</h1>

      <div className="flex size-11 shrink-0 items-center justify-center">
        {action}
      </div>
    </header>
  );
}
