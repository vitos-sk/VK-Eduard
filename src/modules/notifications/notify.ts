import "server-only";

import { configureWebPush, deliverPush, type PushPayload } from "@/lib/push/server";
import { createAdminClient } from "@/lib/supabase/admin";

import { prefsFromRow, type PrefKey } from "./prefs";

/** Что вышло с одним уведомлением: на сколько устройств человека оно ушло. */
export interface PushOutcome {
  /** Подписанных устройств у человека. */
  devices: number;
  sent: number;
  failed: number;
  /** Подписки, которые браузер отозвал (удалены). */
  removed: number;
  /** Человек выключил этот вид уведомлений — ничего не отправлено. */
  muted: boolean;
}

/**
 * Шлёт уведомление человеку на все его устройства, если он не выключил этот вид уведомлений. Тексты строятся под
 * язык каждого устройства (он запомнен при подписке). Ошибки (нет ключей, база недоступна) не глотает — их показывает
 * проверка «Надіслати тестове сповіщення»; остальной код зовёт `notifyUser`, который их только записывает в журнал.
 *
 * `pref: null` — вид уведомления без своего переключателя (например, «новый отчёт» для шефа): его
 * выключает сам человек, отключив уведомления на устройстве.
 */
export async function pushToUser(
  userId: string,
  pref: Exclude<PrefKey, "reportReminder"> | null,
  build: (locale: string) => PushPayload,
): Promise<PushOutcome> {
  const admin = createAdminClient();

  const [{ data: prefsRow }, { data: subs, error }] = await Promise.all([
    admin.from("notification_prefs").select("*").eq("user_id", userId).maybeSingle(),
    admin.from("push_subscriptions").select("id, endpoint, p256dh, auth, locale").eq("user_id", userId),
  ]);

  if (error) throw error;

  const devices = subs?.length ?? 0;
  if (!subs || devices === 0) return { devices, sent: 0, failed: 0, removed: 0, muted: false };
  if (pref && !prefsFromRow(prefsRow)[pref]) return { devices, sent: 0, failed: 0, removed: 0, muted: true };

  configureWebPush();

  const gone: string[] = [];
  let sent = 0;
  let failed = 0;

  await Promise.all(
    subs.map(async (sub) => {
      const result = await deliverPush(sub, build(sub.locale), { ttlSeconds: 24 * 60 * 60, urgency: "high" });

      if (result === "gone") gone.push(sub.id);
      else if (result === "sent") sent += 1;
      else failed += 1;
    }),
  );

  if (gone.length) await admin.from("push_subscriptions").delete().in("id", gone);

  return { devices, sent, failed, removed: gone.length, muted: false };
}

/**
 * Уведомление — приятное дополнение к действию, а не его часть: сообщение уже в базе, поэтому любая ошибка здесь
 * (нет ключей, телефон недоступен) только пишется в журнал и не должна ломать отправку чеклиста, сообщения или отчёта.
 * Возвращает итог (или `null`, если случилась ошибка).
 */
export async function notifyUser(
  userId: string,
  pref: Exclude<PrefKey, "reportReminder"> | null,
  build: (locale: string) => PushPayload,
): Promise<PushOutcome | null> {
  try {
    return await pushToUser(userId, pref, build);
  } catch (error) {
    console.error("[notify]", error);

    return null;
  }
}
