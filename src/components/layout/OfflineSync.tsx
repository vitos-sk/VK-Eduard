"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useT } from "@/lib/i18n/client";
import { useOutboxCounts } from "@/lib/offline/hooks";
import { flushOutbox } from "@/lib/offline/outbox";

/** Как часто повторяем отправку, пока в очереди что-то лежит (на случай, если событие «online» не пришло). */
const RETRY_MS = 30_000;

/**
 * Отправляет очередь «не відправлено»: при запуске, при возвращении связи,
 * при возвращении на вкладку и раз в 30 секунд, пока очередь не пуста.
 * Ничего не рисует — монтируется один раз в `AppShell`.
 */
export function OfflineSync({ userId }: { userId: string }) {
  const t = useT();
  const router = useRouter();
  const { pending } = useOutboxCounts(userId);

  useEffect(() => {
    const flush = () => {
      if (!navigator.onLine) return;

      void flushOutbox(userId).then(({ sent }) => {
        if (sent > 0) {
          toast(t.offline.synced);
          router.refresh();
        }
      });
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") flush();
    };

    flush();
    window.addEventListener("online", flush);
    document.addEventListener("visibilitychange", onVisible);
    const timer = pending > 0 ? window.setInterval(flush, RETRY_MS) : null;

    return () => {
      window.removeEventListener("online", flush);
      document.removeEventListener("visibilitychange", onVisible);
      if (timer !== null) window.clearInterval(timer);
    };
  }, [userId, pending > 0, router, t]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
