"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Car,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Pause,
  Play,
} from "lucide-react";
import { toast } from "sonner";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import { t } from "@/lib/i18n";
import { quickActions } from "@/lib/mock/quick";
import type { QuickAction, QuickActionId } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Иконки не хранятся в моке — сопоставляем их по id пункта. */
const icons: Record<QuickActionId, LucideIcon> = {
  manual_time: Clock,
  start_work: Play,
  start_break: Pause,
  outside: Car,
  create_report: FileText,
};

/** Тост для пунктов, у которых нет своего экрана. */
const toastMessages: Partial<Record<QuickActionId, string>> = {
  start_work: t.quick.workStarted,
  start_break: t.quick.breakStarted,
  create_report: t.common.comingSoon,
};

interface QuickActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Нижний лист по кнопке «+»: пять быстрых действий.
 * Свайп вниз и «Скасувати» закрывают, таб-бар остаётся видимым под листом.
 */
export function QuickActionSheet({ open, onOpenChange }: QuickActionSheetProps) {
  const handleAction = (action: QuickAction) => {
    onOpenChange(false);

    const message = toastMessages[action.id];

    if (message) {
      toast(message);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        aria-describedby={undefined}
        className={cn(
          "mx-auto max-w-[430px] border-border bg-surface text-text",
          // Отступ снизу под таб-бар: он остаётся видимым поверх листа.
          // В «телефоне по центру» под баром ещё 24px рамки — учитываем их.
          "pb-[calc(68px+env(safe-area-inset-bottom))] phone:pb-[calc(68px+1.5rem)]",
          // Лист высокий: при нехватке места скроллится список пунктов,
          // заголовок и «Скасувати» остаются на месте.
          "data-[vaul-drawer-direction=bottom]:max-h-[92dvh]",
        )}
      >
        <div className="flex items-center gap-1 px-2 pt-3 pb-1">
          <DrawerClose
            aria-label={t.common.back}
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-full text-text",
              "transition-colors duration-150 active:bg-surface-2",
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
            )}
          >
            <ChevronLeft className="size-6" strokeWidth={2.4} aria-hidden />
          </DrawerClose>

          <DrawerTitle className="text-[20px] font-bold text-text">
            {t.quick.title}
          </DrawerTitle>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pt-2 pb-1">
          {quickActions.map((action) => (
            <QuickActionRow
              key={action.id}
              action={action}
              onSelect={() => handleAction(action)}
            />
          ))}
        </div>

        <DrawerClose
          className={cn(
            "mx-4 mt-4 mb-3 flex h-[56px] items-center justify-center",
            "rounded-[14px] bg-surface-2 text-[15px] font-bold text-text",
            "transition-transform duration-150 active:scale-[0.98]",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          )}
        >
          {t.quick.cancel}
        </DrawerClose>
      </DrawerContent>
    </Drawer>
  );
}

function QuickActionRow({
  action,
  onSelect,
}: {
  action: QuickAction;
  onSelect: () => void;
}) {
  const Icon = icons[action.id];

  const content = (
    <>
      <span
        aria-hidden
        style={{ color: action.accent, backgroundColor: `${action.accent}1F` }}
        className="flex size-11 shrink-0 items-center justify-center rounded-[12px]"
      >
        <Icon className="size-5" strokeWidth={2.2} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold">{action.title}</span>
        <span className="mt-0.5 block text-[13px] leading-[1.35] font-medium text-text-muted">
          {action.description}
        </span>
      </span>

      <ChevronRight
        className="size-5 shrink-0 text-text-dim"
        strokeWidth={2.4}
        aria-hidden
      />
    </>
  );

  const className = cn(
    "flex w-full items-center gap-3 rounded-[16px] border border-border bg-surface-2 p-3 text-left",
    "transition-transform duration-150 active:scale-[0.98]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
  );

  if (action.href) {
    return (
      <Link href={action.href} onClick={onSelect} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onSelect} className={className}>
      {content}
    </button>
  );
}
