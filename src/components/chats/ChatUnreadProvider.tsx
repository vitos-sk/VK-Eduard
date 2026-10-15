"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { createClient } from "@/lib/supabase/client";
import { getUnreadCount } from "@/modules/chats/queries";

/** Как часто спрашиваем число непрочитанных, пока приложение открыто. */
const POLL_MS = 30_000;

interface ChatUnread {
  count: number;
  /** Спросить заново сразу: после чтения чата или отправки сообщения. */
  refresh: () => void;
}

const ChatUnreadContext = createContext<ChatUnread>({ count: 0, refresh: () => {} });

/**
 * Число непрочитанных сообщений для значка на главной и пункта «Чати» в боковой панели.
 * Спрашивает базу раз в полминуты и при возвращении в приложение; без сети тихо остаётся с прежним числом.
 * Один опрос на всё приложение: телефонная и широкая ветки вёрстки читают его из контекста.
 */
export function ChatUnreadProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    getUnreadCount(createClient())
      .then(setCount)
      .catch(() => {
        /* нет сети: оставляем прежнее число */
      });
  }, []);

  useEffect(() => {
    refresh();

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };

    const timer = window.setInterval(onVisible, POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refresh]);

  const value = useMemo(() => ({ count, refresh }), [count, refresh]);

  return <ChatUnreadContext value={value}>{children}</ChatUnreadContext>;
}

export function useChatUnread(): ChatUnread {
  return useContext(ChatUnreadContext);
}
