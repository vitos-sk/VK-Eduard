/**
 * Браузерная часть push-уведомлений: поддержка, разрешение, подписка.
 * Сервис-воркер (`public/sw.js`) подключается в `ServiceWorkerRegister` — только в боевой сборке.
 */
import type { PushSubscriptionInput } from "@/modules/reminders/actions";

export type PushSupport = "supported" | "ios-needs-install" | "unsupported";

/** Человек сам выключил напоминания на этом устройстве — автоподписка (`PushSync`) его не трогает. */
const OFF_KEY = "vk-push-off";

export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";

  const hasApi = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (hasApi) return "supported";

  // iPhone/iPad: push есть только у приложения, добавленного на экран «Домой» (iOS 16.4+).
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);

  return isIos ? "ios-needs-install" : "unsupported";
}

export function isPushOff(): boolean {
  try {
    return window.localStorage.getItem(OFF_KEY) === "1";
  } catch {
    return false;
  }
}

function setPushOff(value: boolean) {
  try {
    if (value) window.localStorage.setItem(OFF_KEY, "1");
    else window.localStorage.removeItem(OFF_KEY);
  } catch {
    /* не критично */
  }
}

function toUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padded = (base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);

  return bytes;
}

export function serialize(subscription: PushSubscription): PushSubscriptionInput | null {
  const json = subscription.toJSON();
  const { p256dh, auth } = json.keys ?? {};

  return json.endpoint && p256dh && auth ? { endpoint: json.endpoint, p256dh, auth } : null;
}

async function registration(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.ready;
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  return (await registration()).pushManager.getSubscription();
}

/** Спрашивает разрешение (только по нажатию человека) и подписывает устройство. `null` — не разрешил/не получилось. */
export async function subscribeDevice(vapidPublicKey: string): Promise<PushSubscriptionInput | null> {
  const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
  if (permission !== "granted") return null;

  const reg = await registration();
  const existing = await reg.pushManager.getSubscription();
  const subscription =
    existing ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8Array(vapidPublicKey) }));

  setPushOff(false);

  return serialize(subscription);
}

/** Отписывает устройство; возвращает его endpoint, чтобы убрать и серверную запись. */
export async function unsubscribeDevice(): Promise<string | null> {
  const subscription = await currentSubscription();
  setPushOff(true);
  if (!subscription) return null;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();

  return endpoint;
}

/** Выход из аккаунта: подписка принадлежала прежнему человеку — на общем телефоне она не должна достаться следующему. */
export async function detachDeviceOnLogout(): Promise<void> {
  if (pushSupport() !== "supported") return;

  try {
    await (await currentSubscription())?.unsubscribe();
  } catch {
    /* не критично: сервер сам удалит мёртвую подписку после первой же неудачной отправки */
  }
}
