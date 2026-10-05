"use client";

import { useEffect } from "react";

import { preloadCalendar } from "@/components/ui/lazy-calendar";

/** Страницы, которые сохраняем заранее: главная, часы и форма «Додати час» — чтобы открывались без интернета. */
const WARM_PATHS = ["/", "/hours", "/time/manual"];

/** Как часто обновляем сохранённые копии страниц. */
const WARM_EVERY_MS = 1000 * 60 * 60 * 6;
const WARM_KEY = "vk-warm-at";

/**
 * Подключает сервис-воркер (`public/sw.js`) и просит его заранее сохранить страницы.
 * Только в боевой сборке: в разработке воркер мешает горячей перезагрузке.
 * Монтируется внутри приложения (после входа), поэтому чужие страницы не сохраняются.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    let timer: number | undefined;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => {
        let lastWarm = 0;

        try {
          lastWarm = Number(window.localStorage.getItem(WARM_KEY) ?? 0);
        } catch {
          // localStorage недоступен — просто прогреем.
        }

        if (!navigator.onLine || Date.now() - lastWarm < WARM_EVERY_MS) return;

        // Не мешаем первому показу экрана: прогрев — через несколько секунд после загрузки.
        timer = window.setTimeout(() => {
          // Календарь грузится отдельным куском — подтягиваем и его, чтобы дата выбиралась без интернета.
          preloadCalendar();
          registration.active?.postMessage({ type: "warm", paths: WARM_PATHS });

          try {
            window.localStorage.setItem(WARM_KEY, String(Date.now()));
          } catch {
            // не критично
          }
        }, 4000);
      })
      .catch(() => {
        // Воркер не подключился — приложение работает как раньше, без офлайна.
      });

    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
