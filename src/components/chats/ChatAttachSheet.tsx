"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Camera, ListChecks, Plus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { ResponsiveSheet, SheetTitle } from "@/components/ui/responsive-sheet";
import { Ticket } from "@/components/ui/ticket";
import { pluralize } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { sendChecklist } from "@/modules/checklists/actions";
import { getMyChecklists, type ChecklistListEntry } from "@/modules/checklists/queries";

interface ChatAttachSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meId: string;
  /** Собеседник, которому уйдёт чеклист. */
  otherId: string;
  onSent: () => void;
}

/** Скрепка в чате: отправить один из своих чеклистов этому коллеге или создать новый. Фото пока не поддерживаем. */
export function ChatAttachSheet({ open, onOpenChange, meId, otherId, onSent }: ChatAttachSheetProps) {
  const t = useT();
  const locale = useLocale();
  const a = t.chats.attach;
  const [entries, setEntries] = useState<ChecklistListEntry[] | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Свои чеклисты подгружаем при открытии листа: так список всегда свежий, а чат не тащит его заранее.
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    getMyChecklists(createClient(), meId)
      .then((all) => !cancelled && setEntries(all.filter((entry) => !entry.isReceived)))
      .catch(() => !cancelled && setEntries([]));

    return () => {
      cancelled = true;
    };
  }, [open, meId]);

  function send(id: string) {
    setSendingId(id);

    startTransition(async () => {
      const result = await sendChecklist(id, [otherId]);
      setSendingId(null);

      if (result.error) {
        toast(result.error || a.sendError);
        return;
      }

      onOpenChange(false);
      onSent();
    });
  }

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
        {entries?.length === 0 && <p className="px-1 py-2 text-[14px] text-ink-2">{a.empty}</p>}

        {entries?.map((entry) => (
          <Ticket key={entry.id} asChild variant="flat" interactive className={cn("flex w-full items-center gap-3 py-2.5", sendingId === entry.id && "opacity-60")}>
            <button type="button" disabled={sendingId !== null} onClick={() => send(entry.id)}>
              <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-md border border-edge bg-stub text-primary">
                <ListChecks className="size-5" strokeWidth={1.9} />
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-[14px] font-semibold">{entry.title}</span>
                <span className="block truncate text-[12px] text-ink-2">
                  {pluralize(entry.progress.total, locale, t.checklists.count)}
                </span>
              </span>
            </button>
          </Ticket>
        ))}

        <Ticket asChild variant="flat" interactive className="flex w-full items-center gap-3 py-2.5">
          <Link href="/checklists/new" onClick={() => onOpenChange(false)}>
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
