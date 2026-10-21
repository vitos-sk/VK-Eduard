"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, ListChecks, MessageCircle, SquarePen } from "lucide-react";

import { useChatUnread } from "@/components/chats/ChatUnreadProvider";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SearchField } from "@/components/shared/SearchField";
import { initialsOf } from "@/components/shared/Thumb";
import { useAvatarUrls } from "@/components/shared/useAvatarUrls";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Ticket } from "@/components/ui/ticket";
import { useLocale, useT } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";
import { getMyChats, type ChatSummary } from "@/modules/chats/queries";
import { badgeLabel, chatPreview } from "@/modules/chats/rules";
import { listTimeLabel } from "@/modules/chats/time";

/** Как часто обновляем список, пока он открыт. */
const POLL_MS = 15_000;

/** `/chats`: список разговоров, новые сверху, с последним сообщением и числом непрочитанных. */
export function ChatsScreen({ initial, meId }: { initial: ChatSummary[]; meId: string }) {
  const t = useT();
  const locale = useLocale();
  const { refresh: refreshUnread } = useChatUnread();
  const [chats, setChats] = useState(initial);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const load = () => {
      if (document.visibilityState !== "visible") return;

      getMyChats(supabase)
        .then((next) => {
          if (cancelled) return;
          setChats(next);
          refreshUnread();
        })
        .catch(() => {
          /* нет сети: остаётся то, что уже на экране */
        });
    };

    const timer = window.setInterval(load, POLL_MS);
    document.addEventListener("visibilitychange", load);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, [refreshUnread]);

  const avatars = useAvatarUrls(chats.flatMap((chat) => (chat.otherId ? [{ id: chat.otherId, avatar_path: chat.otherAvatarPath }] : [])));
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return needle === "" ? chats : chats.filter((chat) => chat.otherName.toLowerCase().includes(needle));
  }, [chats, query]);

  const labels = {
    you: t.chats.you,
    checklist: t.chats.checklistPreview,
    checklistDeleted: t.chats.checklistDeleted,
    empty: t.chats.noMessages,
  };
  const now = new Date();

  return (
    <div className="pb-6 lg:mx-auto lg:max-w-[640px]">
      <ScreenHeader
        title={t.chats.title}
        action={
          <Button asChild size="sm">
            <Link href="/chats/new">
              <SquarePen className="size-4" strokeWidth={1.9} aria-hidden />
              {t.chats.new}
            </Link>
          </Button>
        }
      />

      <div className="px-4 lg:px-0">
        {chats.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title={t.chats.empty.title}
            description={t.chats.empty.hint}
            action={
              <Button asChild>
                <Link href="/chats/new">{t.chats.empty.start}</Link>
              </Button>
            }
          />
        ) : (
          <>
            {chats.length > 5 && <SearchField className="mb-2" compact value={query} onChange={setQuery} placeholder={t.chats.search} />}

            <div className="flex flex-col gap-2">
              {visible.map((chat) => {
                const preview = chatPreview(chat, meId, labels);

                return (
                  <Ticket key={chat.id} asChild variant="flat" interactive className="flex items-center gap-3">
                    <Link href={`/chats/${chat.id}`}>
                      {chat.kind === "site" ? (
                        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-md border border-edge bg-stub text-primary">
                          <Building2 className="size-5" strokeWidth={1.9} />
                        </span>
                      ) : (
                        <Avatar initials={initialsOf(chat.otherName)} src={chat.otherId ? avatars[chat.otherId] : undefined} className="size-10" />
                      )}

                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-[15px] font-semibold">{chat.otherName}</span>
                          <span className="tabular shrink-0 text-[12px] text-ink-2">
                            {listTimeLabel(new Date(chat.lastAt), now, t.chats, locale)}
                          </span>
                        </span>
                        <span className="flex items-center gap-1 text-[13px] text-ink-2">
                          {preview.kind === "checklist" && <ListChecks className="size-3.5 shrink-0" strokeWidth={1.9} aria-hidden />}
                          <span className="truncate">{preview.text}</span>
                        </span>
                      </span>

                      {chat.unread > 0 && (
                        <span className="tabular flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-on-primary">
                          {badgeLabel(chat.unread)}
                        </span>
                      )}
                    </Link>
                  </Ticket>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
