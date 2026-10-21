"use client";

import Link from "next/link";
import { Camera, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ResponsiveSheet, SheetTitle } from "@/components/ui/responsive-sheet";
import { Ticket } from "@/components/ui/ticket";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { destinationParam, type ChecklistDestination } from "@/modules/checklists/destination";

/** Куда уйдёт чеклист: коллеге в чат 1 на 1 (ему своя копия) или в общий чат объекта (один общий чеклист). */
export type AttachTarget = ChecklistDestination;

interface ChatAttachSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: AttachTarget;
}

/**
 * Скрепка в чате. Готовых чеклистов здесь нет: каждый раз создаётся новый («Створити новий чеклист»), а когда он готов,
 * «Надіслати» отправляет его прямо в этот чат (`target` едет в адрес формы). Фото пока не поддерживаем.
 */
export function ChatAttachSheet({ open, onOpenChange, target }: ChatAttachSheetProps) {
  const t = useT();
  const a = t.chats.attach;

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      mobileClassName={cn(
        "mx-auto max-w-[560px] border-edge bg-ticket text-text",
        "pb-[calc(60px+env(safe-area-inset-bottom))]",
        "data-[vaul-drawer-direction=bottom]:max-h-[92dvh]",
      )}
      desktopClassName="border-edge bg-ticket"
    >
      <div className="p-4 pb-2 text-center lg:text-left">
        <SheetTitle className="text-[20px] font-semibold text-text">{a.title}</SheetTitle>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-4">
        <Ticket asChild variant="flat" interactive className="flex w-full items-center gap-3 py-2.5">
          <Link href={`/checklists/new?to=${encodeURIComponent(destinationParam(target))}`} onClick={() => onOpenChange(false)}>
            <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-md border border-edge bg-stub text-primary">
              <Plus className="size-5" strokeWidth={1.9} />
            </span>
            <span className="min-w-0 flex-1 text-[14px] font-semibold">{a.create}</span>
          </Link>
        </Ticket>

        <div aria-disabled className="flex w-full items-center gap-3 rounded-card border border-edge bg-ticket px-3.5 py-2.5 opacity-60">
          <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-md border border-edge bg-stub text-ink-2">
            <Camera className="size-5" strokeWidth={1.9} />
          </span>
          <span className="min-w-0 flex-1 text-[14px] font-semibold">{a.photo}</span>
          <Badge>{a.soon}</Badge>
        </div>
      </div>
    </ResponsiveSheet>
  );
}
