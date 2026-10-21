import "server-only";

import webpush from "web-push";

/** Подключает ключи VAPID. Без них слать push нельзя — это ошибка настройки, а не «нет подписчиков». */
export function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    throw new Error("Не заданы NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT.");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Путь внутри сайта, который откроется по нажатию. */
  url: string;
  /** Одинаковый `tag` заменяет прежнее уведомление, а не копит стопку. */
  tag: string;
}

/**
 * Отправляет одно уведомление на одно устройство.
 * Возвращает `"gone"`, если браузер отозвал подписку (404/410): запись нужно удалить, чтобы не стучаться вечно.
 */
export async function deliverPush(
  target: PushTarget,
  payload: PushPayload,
  options: { ttlSeconds: number; urgency?: "very-low" | "low" | "normal" | "high" },
): Promise<"sent" | "gone" | "failed"> {
  try {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(payload),
      { TTL: options.ttlSeconds, urgency: options.urgency ?? "normal" },
    );

    return "sent";
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;

    if (status === 404 || status === 410) return "gone";

    // Без этого строки в журнале не было вовсе: «не пришло» и «не отправили» выглядели одинаково.
    let host = "?";
    try {
      host = new URL(target.endpoint).host;
    } catch {
      /* битый endpoint — оставим «?» */
    }
    console.error("[push] не доставлено", { status, host, message: (error as Error).message });

    return "failed";
  }
}
