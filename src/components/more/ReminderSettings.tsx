"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Toggle } from "@/components/ui/toggle";
import { Ticket } from "@/components/ui/ticket";
import { useT } from "@/lib/i18n/client";
import {
  currentSubscription,
  isPushOff,
  pushSupport,
  subscribeDevice,
  unsubscribeDevice,
  type PushSupport,
} from "@/lib/push/client";
import { removePushSubscription, savePushSubscription } from "@/modules/reminders/actions";

type State =
  | { kind: "loading" }
  | { kind: "dev" }
  | { kind: "blocked"; why: "unsupported" | "ios-needs-install" | "denied" }
  | { kind: "ready"; enabled: boolean };

/**
 * Переключатель «Сповіщення на цьому пристрої» на странице «Сповіщення»: подписывает телефон на push.
 * Какие именно уведомления слать (напоминание о звіте, чаты, чеклисты) выбирает `NotificationKinds`.
 * Разрешение браузер спрашивает только здесь, по нажатию человека — иначе его почти всегда отклоняют.
 */
export function ReminderSettings({ vapidPublicKey }: { vapidPublicKey: string }) {
  const t = useT();
  const n = t.profile.notificationsPage;
  const [state, setState] = useState<State>({ kind: "loading" });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function detect(): Promise<State> {
      if (process.env.NODE_ENV !== "production" || !vapidPublicKey) return { kind: "dev" };

      const support: PushSupport = pushSupport();
      if (support !== "supported") return { kind: "blocked", why: support };
      if (Notification.permission === "denied") return { kind: "blocked", why: "denied" };

      const subscription = await currentSubscription();

      return { kind: "ready", enabled: Boolean(subscription) && Notification.permission === "granted" && !isPushOff() };
    }

    detect()
      .then((next) => !cancelled && setState(next))
      .catch(() => !cancelled && setState({ kind: "blocked", why: "unsupported" }));

    return () => {
      cancelled = true;
    };
  }, [vapidPublicKey]);

  function toggle(next: boolean) {
    startTransition(async () => {
      try {
        if (next) {
          const input = await subscribeDevice(vapidPublicKey);

          if (!input) {
            // Человек нажал «Не дозволяти» в окне браузера.
            setState({ kind: "blocked", why: "denied" });
            return;
          }

          const result = await savePushSubscription(input, navigator.userAgent);
          if (!result.ok) throw new Error(result.reason);
        } else {
          const endpoint = await unsubscribeDevice();
          if (endpoint) await removePushSubscription(endpoint);
        }

        setState({ kind: "ready", enabled: next });
      } catch {
        toast.error(n.enableError);
      }
    });
  }

  if (state.kind === "loading") return null;

  if (state.kind === "dev") return <p>{n.devOnly}</p>;

  if (state.kind === "blocked") {
    return (
      <p>{state.why === "unsupported" ? n.unsupported : state.why === "ios-needs-install" ? n.iosInstall : n.denied}</p>
    );
  }

  return (
    <Ticket variant="sections">
      <label className="flex min-h-14 cursor-pointer items-center gap-3 px-3.5">
        <span className="flex flex-1 flex-col">
          <span className="text-[14px] font-medium text-text">{n.deviceLabel}</span>
          <span className="text-[12px] text-ink-2">{n.deviceHint}</span>
        </span>
        <Toggle checked={state.enabled} disabled={isPending} onCheckedChange={toggle} aria-label={n.deviceLabel} />
      </label>
    </Ticket>
  );
}
