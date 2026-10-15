import "server-only";

import { configureWebPush, deliverPush, type PushPayload } from "@/lib/push/server";
import { createAdminClient } from "@/lib/supabase/admin";

import { prefsFromRow, type PrefKey } from "./prefs";

/**
 * Шлёт уведомление человеку на все его устройства, если он не выключил этот вид уведомлений.
 * Тексты строятся под язык каждого устройства (он запомнен при подписке).
 *
 * Уведомление — приятное дополнение к действию, а не его часть: сообщение уже в базе, поэтому любая ошибка здесь
 * (нет ключей, телефон недоступен) только пишется в лог и не должна ломать отправку чеклиста или сообщения.
 */
export async function notifyUser(userId: string, pref: Exclude<PrefKey, "reportReminder">, build: (locale: string) => PushPayload): Promise<void> {
  try {
    const admin = createAdminClient();

    const [{ data: prefsRow }, { data: subs, error }] = await Promise.all([
      admin.from("notification_prefs").select("*").eq("user_id", userId).maybeSingle(),
      admin.from("push_subscriptions").select("id, endpoint, p256dh, auth, locale").eq("user_id", userId),
    ]);

    if (error) throw error;
    if (!subs?.length || !prefsFromRow(prefsRow)[pref]) return;

    configureWebPush();

    const gone: string[] = [];

    await Promise.all(
      subs.map(async (sub) => {
        const result = await deliverPush(sub, build(sub.locale), { ttlSeconds: 24 * 60 * 60, urgency: "high" });
        if (result === "gone") gone.push(sub.id);
      }),
    );

    if (gone.length) await admin.from("push_subscriptions").delete().in("id", gone);
  } catch (error) {
    console.error("[notify]", error);
  }
}
