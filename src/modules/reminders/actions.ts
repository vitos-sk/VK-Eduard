"use server";

import { getLocale } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/modules/auth/session";
import { pushToUser } from "@/modules/notifications/notify";

import { testText } from "./texts";

export type PushResult = { ok: true } | { ok: false; reason: "no-profile" | "invalid" | "error" };

export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
}

function isValid(input: PushSubscriptionInput): boolean {
  return (
    typeof input.endpoint === "string" &&
    input.endpoint.startsWith("https://") &&
    input.endpoint.length <= 2048 &&
    typeof input.p256dh === "string" &&
    input.p256dh.length > 0 &&
    input.p256dh.length <= 256 &&
    typeof input.auth === "string" &&
    input.auth.length > 0 &&
    input.auth.length <= 128
  );
}

/**
 * Сохраняет push-подписку устройства за текущим человеком (или переносит на него, если телефон общий).
 * Язык берём из куки — уведомление придёт на языке интерфейса. Подписаться может любой сотрудник, включая шефа, — это его личный выбор.
 */
export async function savePushSubscription(input: PushSubscriptionInput, userAgent?: string): Promise<PushResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, reason: "no-profile" };
  if (!isValid(input)) return { ok: false, reason: "invalid" };

  // Сервисный ключ: строка с этим endpoint могла принадлежать прошлому владельцу телефона,
  // а обычная политика RLS не даёт перезаписывать чужое. Личность уже проверена выше.
  const { error } = await createAdminClient()
    .from("push_subscriptions")
    .upsert(
      {
        user_id: profile.id,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        locale: await getLocale(),
        user_agent: userAgent?.slice(0, 300) ?? null,
      },
      { onConflict: "endpoint" },
    );

  return error ? { ok: false, reason: "error" } : { ok: true };
}

/** Отключает напоминания на этом устройстве: удаляет свою строку (RLS не даст тронуть чужую). */
export async function removePushSubscription(endpoint: string): Promise<PushResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, reason: "no-profile" };

  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", profile.id);

  return error ? { ok: false, reason: "error" } : { ok: true };
}

export type TestPushResult =
  | { ok: true; devices: number; sent: number }
  | { ok: false; reason: "no-profile" | "config" | "error" };

/**
 * Проверка «Надіслати тестове сповіщення»: шлёт пробное уведомление на все устройства самого человека и говорит, на сколько
 * оно ушло. `devices: 0` — этот аккаунт ещё ни на что не подписан; `config` — на сервере нет ключей VAPID.
 */
export async function sendTestPush(): Promise<TestPushResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, reason: "no-profile" };

  try {
    const outcome = await pushToUser(profile.id, null, (locale) => ({
      ...testText(locale),
      url: "/more/notifications",
      tag: "push-test",
    }));

    return { ok: true, devices: outcome.devices, sent: outcome.sent };
  } catch (error) {
    console.error("[push-test]", error);

    return { ok: false, reason: error instanceof Error && /VAPID/.test(error.message) ? "config" : "error" };
  }
}
