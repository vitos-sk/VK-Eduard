"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { useChatUnread } from "@/components/chats/ChatUnreadProvider";
import { fmt } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { badgeLabel } from "@/modules/chats/rules";
import { cn } from "@/lib/utils";

/**
 * Значок чатов в шапке главной: рядом с аватаркой, с цифрой непрочитанных.
 * На широком экране его заменяет пункт «Чати» в боковой панели.
 */
export function ChatBell({ className }: { className?: string }) {
  const t = useT();
  const { count } = useChatUnread();

  return (
    <Link
      href="/chats"
      aria-label={count > 0 ? `${t.chats.open}. ${fmt(t.chats.unread, { n: count })}` : t.chats.open}
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center rounded-md border border-edge bg-ticket text-ink outline-none before:absolute before:top-1/2 before:left-1/2 before:size-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] hover:bg-primary-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      <MessageCircle className="size-[18px]" strokeWidth={1.9} aria-hidden />
      {count > 0 && (
        <span
          aria-hidden
          className="tabular absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-paper bg-err px-1 text-[10px] leading-none font-semibold text-on-primary"
        >
          {badgeLabel(count)}
        </span>
      )}
    </Link>
  );
}
