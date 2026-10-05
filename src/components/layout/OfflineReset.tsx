"use client";

import { useEffect } from "react";

import { clearOfflineCache } from "@/lib/offline/cache";

/**
 * Стоит на экранах для невошедших (`/welcome`, `/login`): сюда попадают после выхода.
 * Стирает сохранённые на телефоне данные экранов и копии страниц прежнего пользователя —
 * на общем телефоне они не должны достаться следующему. Очередь «не відправлено»
 * не трогаем: она привязана к пользователю и уйдёт, когда он снова войдёт.
 */
export function OfflineReset() {
  useEffect(() => {
    void clearOfflineCache();

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.ready.then((registration) => {
        registration.active?.postMessage({ type: "clear" });
      });

      try {
        window.localStorage.removeItem("vk-warm-at");
      } catch {
        // не критично
      }
    }
  }, []);

  return null;
}
