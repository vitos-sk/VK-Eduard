"use server";

import { getLocale } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/modules/auth/session";

export type PushResult = { ok: true } | { ok: false; reason: "no-profile" | "boss" | "invalid" | "error" };

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
 * Язык берём из куки — уведомление придёт на языке интерфейса. Шефам не пишем: им напоминаний нет.
 */
export async function savePushSubscription(input: PushSubscriptionInput, userAgent?: string): Promise<PushResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, reason: "no-profile" };
  if (profile.role === "boss") return { ok: false, reason: "boss" };
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
