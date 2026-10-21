"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { BellRing } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useT } from "@/lib/i18n/client";
import { currentSubscription, isPushOff, pushSupport, subscribeDevice } from "@/lib/push/client";
import { savePushSubscription } from "@/modules/reminders/actions";

const SNOOZE_KEY = "vk-push-prompt-until";
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;

type Mode = "none" | "ask" | "ios";

function isSnoozed(): boolean {
  try {
    return Number(window.localStorage.getItem(SNOOZE_KEY) ?? 0) > Date.now();
  } catch {
    return false;
  }
}

/**
 * Предложение включить уведомления одним нажатием — чтобы не искать переключатель в настройках. Рабочему — напоминание
 * «внесите отчёт», шефу — «сообщим о новых отчётах» (без подписанного телефона слать уведомление шефу некуда).
 * Само разрешение браузер спрашивает только после нажатия «Увімкнути» (без нажатия его почти всегда отклоняют).
 * Не показывается, если разрешение уже дано/отклонено, человек сам выключал уведомления или нажал «Пізніше»
 * (спросим снова через 3 дня).
 */
export function ReminderPrompt({ isBoss = false }: { isBoss?: boolean }) {
  const t = useT();
  const n = t.profile.notificationsPage;
  const pathname = usePathname();
  const [mode, setMode] = useState<Mode>("none");
  const [isPending, startTransition] = useTransition();
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (!vapidKey || process.env.NODE_ENV !== "production" || isSnoozed()) return;

    let cancelled = false;

    (async (): Promise<Mode> => {
      const support = pushSupport();
      if (support === "ios-needs-install") return "ios";
      if (support !== "supported" || isPushOff()) return "none";
      if (Notification.permission !== "default") return "none";

      return (await currentSubscription()) ? "none" : "ask";
    })()
      .then((next) => !cancelled && setMode(next))
      .catch(() => {
        /* воркер не готов — предложим в следующий раз */
      });

    return () => {
      cancelled = true;
    };
  }, [vapidKey]);

  function snooze() {
    try {
      window.localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
    } catch {
      /* не критично */
    }
    setMode("none");
  }

  function enable() {
    if (!vapidKey) return;

    startTransition(async () => {
      try {
        const input = await subscribeDevice(vapidKey);
        // Нажал «Не дозволяти» — браузер запомнит отказ, больше не предлагаем.
        if (input) {
          const result = await savePushSubscription(input, navigator.userAgent);
          if (!result.ok) throw new Error(result.reason);
        }
        setMode("none");
      } catch {
        toast.error(n.enableError);
      }
    });
  }

  if (mode === "none" || pathname.startsWith("/more/notifications")) return null;

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-24 z-30 mx-auto max-w-[536px] lg:inset-x-auto lg:right-6 lg:bottom-6 lg:w-[380px]">
      <Card padding="md" className="pointer-events-auto" role="region" aria-label={n.reminderLabel}>
        <div className="flex gap-3">
          <BellRing className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={2} aria-hidden />
          <div className="flex-1 space-y-3">
            <div className="space-y-1">
              <p className="text-[14px] font-semibold text-text">{isBoss ? n.promptBossTitle : n.promptTitle}</p>
              <p className="text-[13px] text-text-muted">{mode === "ios" ? n.iosInstall : isBoss ? n.promptBossBody : n.promptBody}</p>
            </div>
            <div className="flex gap-2">
              {mode === "ask" && (
                <Button size="sm" loading={isPending} onClick={enable}>
                  {n.promptEnable}
                </Button>
              )}
              <Button size="sm" variant="ghost" disabled={isPending} onClick={snooze}>
                {mode === "ios" ? n.promptGotIt : n.promptLater}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
