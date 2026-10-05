"use client";

import { Button } from "@/components/ui/button";
import { OfflineBanner } from "@/components/ui/offline-banner";
import { fmt } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { useOnline, useOutboxCounts } from "@/lib/offline/hooks";
import { discardOutboxEntry, flushOutbox, listOutbox } from "@/lib/offline/outbox";

/**
 * Полоса вверху экрана: «Немає зв'язку», «Не відправлено: N» и «Не вдалося відправити».
 * Показывается только когда есть что сказать; сама отправка — в `OfflineSync`.
 */
export function SyncBanner({ userId }: { userId: string }) {
  const t = useT();
  const online = useOnline();
  const { pending, rejected } = useOutboxCounts(userId);

  const discardRejected = async () => {
    for (const entry of await listOutbox(userId)) {
      if (entry.rejected) await discardOutboxEntry(entry.id);
    }
  };

  if (online && pending === 0 && rejected === 0) return null;

  return (
    <div className="space-y-px">
      {!online && <OfflineBanner>{t.offline.banner}</OfflineBanner>}

      {pending > 0 && (
        <OfflineBanner className="flex items-center justify-center gap-3">
          <span>{fmt(t.offline.pending, { n: pending })}</span>
          {online && (
            <Button size="sm" variant="outline" onClick={() => void flushOutbox(userId)}>
              {t.offline.syncNow}
            </Button>
          )}
        </OfflineBanner>
      )}

      {rejected > 0 && (
        <OfflineBanner className="flex items-center justify-center gap-3 text-err">
          <span>{fmt(t.offline.rejected, { n: rejected })}</span>
          <Button size="sm" variant="outline" onClick={() => void discardRejected()}>
            {t.offline.discard}
          </Button>
        </OfflineBanner>
      )}
    </div>
  );
}
