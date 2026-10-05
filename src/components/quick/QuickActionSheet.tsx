"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { ChevronRight, FileText, LayoutDashboard } from "lucide-react";

import { Ticket } from "@/components/ui/ticket";
import { useT } from "@/lib/i18n/client";
import { getQuickActions } from "@/lib/mock/quick";
import type { QuickAction, QuickActionId } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Иконки не хранятся в моке — сопоставляем их по id пункта. */
const icons: Record<QuickActionId, LucideIcon> = {
  create_report: FileText,
  dashboard: LayoutDashboard,
};

interface QuickActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Пункт «Дашборд» показуємо тільки шефу. */
  isBoss: boolean;
}

/**
 * Меню кнопки «+» на телефоне. Не перетягиваемый лист, а простая плашка,
 * которая выезжает из таб-бара снизу вверх: затемнение заканчивается над баром,
 * сам бар остаётся на месте и рабочим.
 *
 * Закрывается: повторный тап по «+», тап по затемнению, Escape,
 * выбор пункта или переход на другую вкладку.
 * Рендерится внутри колонки (`PhoneFrame`), поэтому позиционируется относительно неё.
 */
export function QuickActionSheet({ open, onOpenChange, isBoss }: QuickActionSheetProps) {
  const t = useT();
  const pathname = usePathname();
  const lastPathname = useRef(pathname);

  useEffect(() => {
    if (lastPathname.current !== pathname) {
      lastPathname.current = pathname;
      onOpenChange(false);
    }
  }, [pathname, onOpenChange]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  const quickActions = getQuickActions(t);
  const visibleActions = isBoss
    ? quickActions
    : quickActions.filter((action) => action.id !== "dashboard");

  return (
    <div
      inert={!open}
      className={cn(
        // Заканчивается над таб-баром (84 px) — бар не затемняется
        "absolute inset-x-0 top-0 bottom-[calc(60px+env(safe-area-inset-bottom))] z-50 overflow-hidden",
        !open && "pointer-events-none",
      )}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label={t.common.close}
        onClick={() => onOpenChange(false)}
        className={cn(
          "absolute inset-0 bg-overlay transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        )}
      />

      <div
        role="dialog"
        aria-label={t.quick.title}
        className={cn(
          "absolute inset-x-0 bottom-0 rounded-t-modal border border-b-0 border-edge bg-ticket px-4 pt-4 pb-4 transition-transform duration-200 ease-out",
          open ? "translate-y-0" : "translate-y-full",
        )}
      >
        <p className="text-[15px] font-semibold">{t.quick.title}</p>

        <div className="mt-3 space-y-2">
          {visibleActions.map((action) => (
            <QuickActionRow key={action.id} action={action} onSelect={() => onOpenChange(false)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function QuickActionRow({ action, onSelect }: { action: QuickAction; onSelect: () => void }) {
  const Icon = icons[action.id];

  const content = (
    <>
      <span
        aria-hidden
        className="flex size-11 shrink-0 items-center justify-center rounded-md border border-edge bg-stub text-primary"
      >
        <Icon className="size-5" strokeWidth={1.9} />
      </span>

      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[15px] font-semibold">{action.title}</span>
        <span className="mt-0.5 block text-[13px] leading-[1.35] text-text-muted">
          {action.description}
        </span>
      </span>

      <ChevronRight className="size-4 shrink-0 text-text-dim" strokeWidth={1.9} aria-hidden />
    </>
  );

  const className = "flex w-full items-center gap-3";

  if (action.href) {
    return (
      <Ticket asChild variant="flat" interactive className={className}>
        <Link href={action.href} onClick={onSelect}>
          {content}
        </Link>
      </Ticket>
    );
  }

  return (
    <Ticket asChild variant="flat" interactive className={className}>
      <button type="button" onClick={onSelect}>
        {content}
      </button>
    </Ticket>
  );
}
