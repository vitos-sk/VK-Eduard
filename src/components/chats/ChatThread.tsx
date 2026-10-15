"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ListChecks, Paperclip, SendHorizontal } from "lucide-react";
import { toast } from "sonner";

import { ChatAttachSheet } from "@/components/chats/ChatAttachSheet";
import { useChatUnread } from "@/components/chats/ChatUnreadProvider";
import { initialsOf } from "@/components/shared/Thumb";
import { useAvatarUrls } from "@/components/shared/useAvatarUrls";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressPips } from "@/components/ui/progress-pips";
import { Textarea } from "@/components/ui/input";
import { fmt, formatTime } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { sendChatMessage } from "@/modules/chats/actions";
import { getChatMessages, type ChatHeader, type ChatMessageView } from "@/modules/chats/queries";
import { normalizeMessage, sameMessages } from "@/modules/chats/rules";
import { dayLabel, startsNewDay } from "@/modules/chats/time";

/** Как часто спрашиваем новые сообщения, пока чат открыт и виден. */
const POLL_MS = 4_000;

/** Высота поля ввода растёт вместе с текстом, но не выше этого. */
const COMPOSER_MAX_PX = 128;

interface PendingMessage {
  clientId: string;
  text: string;
}

interface ChatThreadProps {
  chat: ChatHeader;
  meId: string;
  initialMessages: ChatMessageView[];
}

/**
 * `/chats/[id]`: переписка 1 на 1. Сообщения подтягиваются опросом раз в несколько секунд (пока вкладка видна),
 * своё сообщение появляется сразу и подтверждается ответом сервера. Карточка чеклиста показывает прогресс получателя.
 */
export function ChatThread({ chat, meId, initialMessages }: ChatThreadProps) {
  const t = useT();
  const locale = useLocale();
  const { refresh: refreshUnread } = useChatUnread();
  const [messages, setMessages] = useState(initialMessages);
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [attachOpen, setAttachOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const avatars = useAvatarUrls([{ id: chat.otherId, avatar_path: chat.otherAvatarPath }]);

  const reload = useCallback(async () => {
    try {
      const next = await getChatMessages(createClient(), chat.id);
      setMessages((current) => (sameMessages(current, next) ? current : next));
    } catch {
      /* нет сети: остаётся то, что уже на экране */
    }
  }, [chat.id]);

  // Опрос новых сообщений, пока вкладка видна.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") void reload();
    };

    const timer = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [reload]);

  // Всё, что пришло от собеседника, считается прочитанным, пока чат открыт.
  const lastIncomingId = [...messages].reverse().find((message) => message.senderId !== meId)?.id ?? null;

  useEffect(() => {
    createClient()
      .rpc("mark_chat_read", { p_chat: chat.id })
      .then(({ error }) => {
        if (!error) refreshUnread();
      });
  }, [chat.id, lastIncomingId, refreshUnread]);

  // К последнему сообщению — при открытии и когда появилось новое.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, pending.length]);

  function resizeComposer() {
    const field = composerRef.current;
    if (!field) return;

    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, COMPOSER_MAX_PX)}px`;
  }

  function handleSend() {
    const text = normalizeMessage(draft);
    if (text === null) return;

    const clientId = crypto.randomUUID();
    setPending((current) => [...current, { clientId, text }]);
    setDraft("");
    requestAnimationFrame(resizeComposer);

    const fail = (message: string) => {
      toast(message);
      // Текст возвращается в поле, чтобы не набирать заново (если человек уже не начал писать другое).
      setDraft((current) => (current === "" ? text : current));
    };

    sendChatMessage({ chatId: chat.id, text, clientId })
      .then((result) => {
        if (result.error) fail(result.error);
      })
      .catch(() => fail(t.chats.sendError))
      .finally(() => {
        setPending((current) => current.filter((item) => item.clientId !== clientId));
        void reload();
      });
  }

  const now = new Date();
  const roleLabel = chat.otherIsBoss ? t.chats.roleBoss : t.chats.roleWorker;

  return (
    <div className="flex min-h-[calc(100dvh-60px-env(safe-area-inset-bottom)-1.5rem)] flex-col lg:min-h-[calc(100dvh-3rem)]">
      <header className="flex items-center gap-2 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 lg:mx-auto lg:w-full lg:max-w-[640px] lg:px-0 lg:pt-0">
        <Button asChild variant="ghost" size="icon-sm" className="-ml-1.5">
          <Link href="/chats" aria-label={t.common.back}>
            <ChevronLeft className="size-5" strokeWidth={1.9} aria-hidden />
          </Link>
        </Button>
        <Avatar initials={initialsOf(chat.otherName)} src={avatars[chat.otherId]} className="size-9" />
        <div className="min-w-0">
          <h1 className="truncate text-[16px] leading-tight font-semibold">{chat.otherName}</h1>
          <p className="text-[12px] text-ink-2">{roleLabel}</p>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-1.5 px-4 pb-3 lg:mx-auto lg:w-full lg:max-w-[640px] lg:px-0">
        {messages.length === 0 && pending.length === 0 && (
          <p className="my-auto py-10 text-center text-[14px] text-ink-2">{t.chats.noMessages}</p>
        )}

        {messages.map((message, index) => {
          const created = new Date(message.createdAt);
          const previous = index > 0 ? new Date(messages[index - 1].createdAt) : null;
          const mine = message.senderId === meId;

          return (
            <Fragment key={message.id}>
              {startsNewDay(previous, created) && (
                <span className="my-1.5 self-center rounded-sm bg-stub px-2 py-0.5 text-[12px] text-ink-2">
                  {dayLabel(created, now, t.chats, locale)}
                </span>
              )}

              {message.kind === "checklist" ? (
                <ChecklistCard message={message} mine={mine} otherName={chat.otherName} meId={meId} time={formatTime(created)} />
              ) : (
                <Bubble mine={mine} time={formatTime(created)}>
                  {message.body}
                </Bubble>
              )}
            </Fragment>
          );
        })}

        {pending.map((item) => (
          <Bubble key={item.clientId} mine time="…" muted>
            {item.text}
          </Bubble>
        ))}

        <div ref={endRef} />
      </div>

      {/* Панель ввода липнет к низу; на телефоне опущена на отступ области прокрутки (как `StickyActionBar`). */}
      <div className="perf-t sticky -bottom-6 z-10 bg-paper px-4 pt-2 pb-[calc(0.5rem+1.5rem)] lg:bottom-0 lg:pb-2">
        <div className="flex items-end gap-2 lg:mx-auto lg:max-w-[640px]">
          <Button variant="outline" size="icon" aria-label={t.chats.attach.open} onClick={() => setAttachOpen(true)}>
            <Paperclip className="size-5" strokeWidth={1.9} aria-hidden />
          </Button>

          <Textarea
            ref={composerRef}
            rows={1}
            value={draft}
            placeholder={t.chats.messagePlaceholder}
            aria-label={t.chats.messagePlaceholder}
            className={cn("max-h-32 min-h-ctl-md resize-none px-3 py-2.5")}
            onChange={(event) => {
              setDraft(event.target.value);
              resizeComposer();
            }}
            onKeyDown={(event) => {
              // На компьютере Enter отправляет, Shift+Enter переносит строку; на телефоне Enter всегда перенос строки.
              if (event.key === "Enter" && !event.shiftKey && window.matchMedia("(pointer: fine)").matches) {
                event.preventDefault();
                handleSend();
              }
            }}
          />

          <Button size="icon" aria-label={t.chats.send} disabled={normalizeMessage(draft) === null} onClick={handleSend}>
            <SendHorizontal className="size-5" strokeWidth={1.9} aria-hidden />
          </Button>
        </div>
      </div>

      <ChatAttachSheet open={attachOpen} onOpenChange={setAttachOpen} meId={meId} otherId={chat.otherId} onSent={() => void reload()} />
    </div>
  );
}

function Bubble({ mine, time, muted = false, children }: { mine: boolean; time: string; muted?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "max-w-[84%] rounded-card border px-3 pt-1.5 pb-1 text-[15px] leading-[1.35] break-words whitespace-pre-wrap",
        mine ? "self-end rounded-tr-sm border-edge bg-primary-tint" : "self-start rounded-tl-sm border-edge bg-ticket",
        muted && "opacity-60",
      )}
    >
      {children}
      <span className="tabular mt-0.5 block text-right text-[11px] text-ink-3">{time}</span>
    </div>
  );
}

function ChecklistCard({
  message,
  mine,
  otherName,
  meId,
  time,
}: {
  message: ChatMessageView;
  mine: boolean;
  otherName: string;
  meId: string;
  time: string;
}) {
  const t = useT();
  const c = t.chats.card;
  const list = message.checklist;

  if (!list) {
    return (
      <Bubble mine={mine} time={time} muted>
        {c.deleted}
      </Bubble>
    );
  }

  // Копия принадлежит получателю: если она моя, открываю и отмечаю; если нет, смотрю прогресс коллеги.
  const isMyCopy = list.ownerId === meId;
  const finished = list.total > 0 && list.done === list.total;
  const progressText = isMyCopy
    ? fmt(c.mine, { done: list.done, total: list.total })
    : fmt(c.progress, { name: otherName, done: list.done, total: list.total });

  return (
    <div className={cn("w-[88%] rounded-card border border-edge bg-ticket p-3", mine ? "self-end" : "self-start")}>
      <div className="flex items-center gap-2.5">
        <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-md border border-edge bg-stub text-primary">
          <ListChecks className="size-[18px]" strokeWidth={1.9} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{list.title}</span>
        {isMyCopy && list.done === 0 && <Badge variant="accent">{c.newBadge}</Badge>}
        {finished && <Badge variant="success">{c.doneBadge}</Badge>}
      </div>

      <ProgressPips className="mt-2.5" done={list.done} total={list.total} label={progressText} />
      <p className="mt-1.5 text-[13px] text-ink-2">{progressText}</p>

      <Button asChild size="sm" variant={isMyCopy ? "primary" : "outline"} block className="mt-2.5">
        <Link href={`/checklists/${list.id}`}>{isMyCopy ? c.open : c.view}</Link>
      </Button>

      <span className="tabular mt-1 block text-right text-[11px] text-ink-3">{time}</span>
    </div>
  );
}
