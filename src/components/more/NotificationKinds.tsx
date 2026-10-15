"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Ticket } from "@/components/ui/ticket";
import { Toggle } from "@/components/ui/toggle";
import { useT } from "@/lib/i18n/client";
import { saveNotificationPref } from "@/modules/notifications/actions";
import type { NotificationPrefs, PrefKey } from "@/modules/notifications/prefs";

/** Какие уведомления человек хочет получать: напоминание о звіте, сообщения, чеклисты. Хранится на сервере, на всех устройствах. */
export function NotificationKinds({ initial }: { initial: NotificationPrefs }) {
  const t = useT();
  const n = t.profile.notificationsPage;
  const [prefs, setPrefs] = useState(initial);
  const [pendingKey, setPendingKey] = useState<PrefKey | null>(null);
  const [, startTransition] = useTransition();

  const rows: { key: PrefKey; label: string; hint: string }[] = [
    { key: "reportReminder", label: n.reminderLabel, hint: n.reminderHint },
    { key: "chatMessages", label: n.chatMessagesLabel, hint: n.chatMessagesHint },
    { key: "chatChecklists", label: n.chatChecklistsLabel, hint: n.chatChecklistsHint },
    { key: "checklistDone", label: n.checklistDoneLabel, hint: n.checklistDoneHint },
  ];

  function toggle(key: PrefKey, value: boolean) {
    const before = prefs[key];
    setPrefs((current) => ({ ...current, [key]: value }));
    setPendingKey(key);

    startTransition(async () => {
      const result = await saveNotificationPref(key, value).catch(() => ({ ok: false as const }));

      if (!result.ok) {
        setPrefs((current) => ({ ...current, [key]: before }));
        toast.error(n.saveError);
      }

      setPendingKey(null);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-[13px] font-medium text-ink-2">{n.kindsTitle}</h2>

      <Ticket variant="sections">
        {rows.map((row) => (
          <label key={row.key} className="flex min-h-14 cursor-pointer items-center gap-3 px-3.5 not-first:border-t not-first:border-dashed not-first:border-perf">
            <span className="flex flex-1 flex-col">
              <span className="text-[14px] font-medium text-text">{row.label}</span>
              <span className="text-[12px] text-ink-2">{row.hint}</span>
            </span>
            <Toggle checked={prefs[row.key]} disabled={pendingKey === row.key} onCheckedChange={(value) => toggle(row.key, value)} aria-label={row.label} />
          </label>
        ))}
      </Ticket>
    </div>
  );
}
