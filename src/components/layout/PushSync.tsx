"use client";

import { useEffect } from "react";

import { useLocale } from "@/lib/i18n/client";
import { currentSubscription, isPushOff, pushSupport, serialize, subscribeDevice } from "@/lib/push/client";
import { savePushSubscription } from "@/modules/reminders/actions";

const SYNCED_KEY = "vk-push-synced";

/**
 * Держит напоминание рабочего «включённым без хлопот»: если разрешение уже дано и человек сам не выключал,
 * подписка восстанавливается после выхода/входа, смены языка или когда браузер сменил ключи подписки.
 * Шефам не монтируется (см. `AppShell`). Ничего не спрашивает у человека — только тихо синхронизирует.
 */
export function PushSync({ userId }: { userId: string }) {
  const locale = useLocale();

  useEffect(() => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey || process.env.NODE_ENV !== "production") return;
    if (pushSupport() !== "supported" || Notification.permission !== "granted" || isPushOff()) return;

    let cancelled = false;

    (async () => {
      const existing = await currentSubscription();
      const input = existing ? serialize(existing) : await subscribeDevice(vapidKey);
      if (!input || cancelled) return;

      // Не пишем в базу, если ничего не изменилось с прошлого раза (тот же человек, устройство и язык).
      const fingerprint = `${userId}|${input.endpoint}|${locale}`;
      try {
        if (window.localStorage.getItem(SYNCED_KEY) === fingerprint) return;
      } catch {
        /* без localStorage просто сохраним ещё раз */
      }

      const result = await savePushSubscription(input, navigator.userAgent);

      if (result.ok) {
        try {
          window.localStorage.setItem(SYNCED_KEY, fingerprint);
        } catch {
          /* не критично */
        }
      }
    })().catch(() => {
      /* нет сети или воркер не готов — повторим при следующем запуске */
    });

    return () => {
      cancelled = true;
    };
  }, [userId, locale]);

  return null;
}
