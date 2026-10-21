"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { preloadCalendar } from "@/components/ui/lazy-calendar";
import { isSnapshotPath, warmPathsFor, WARM_EVERY_MS } from "@/lib/offline/warm-paths";

const WARM_KEY = "vk-warm-at";

/** Через сколько после открытия страницы-детали просим воркер сохранить её копию. */
const SNAPSHOT_DELAY_MS = 2000;

function canUseWorker(): boolean {
  return process.env.NODE_ENV === "production" && "serviceWorker" in navigator;
}

/** В режиме экономии трафика ничего не качаем заранее. */
function savesData(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;

  return connection?.saveData === true;
}

function lastWarmAt(): number {
  try {
    return Number(window.localStorage.getItem(WARM_KEY) ?? 0);
  } catch {
    return 0; // localStorage недоступен — просто прогреем
  }
}

function rememberWarm() {
  try {
    window.localStorage.setItem(WARM_KEY, String(Date.now()));
  } catch {
    // не критично
  }
}

/**
 * Подключает сервис-воркер (`public/sw.js`), просит его заранее сохранить основные экраны и запоминает
 * страницы-детали, которые человек открыл. Только в боевой сборке: в разработке воркер мешает горячей
 * перезагрузке. Монтируется внутри приложения (после входа), поэтому чужие страницы не сохраняются.
 */
export function ServiceWorkerRegister({ role }: { role: string }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!canUseWorker()) return;

    let timer: number | undefined;

    const warm = (registration: ServiceWorkerRegistration) => {
      if (!navigator.onLine || savesData()) return;

      // Календарь грузится отдельным куском — подтягиваем и его, чтобы дата выбиралась без интернета.
      preloadCalendar();
      registration.active?.postMessage({ type: "warm", paths: warmPathsFor(role) });
      rememberWarm();
    };

    const warmIfStale = () => {
      if (Date.now() - lastWarmAt() < WARM_EVERY_MS) return;

      void navigator.serviceWorker.ready.then(warm);
    };

    // Вышла новая версия приложения: воркер просит сохранить свежие копии (старые он удалит сам, когда они готовы).
    const onWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === "sw-updated") void navigator.serviceWorker.ready.then(warm);
    };

    navigator.serviceWorker.addEventListener("message", onWorkerMessage);
    window.addEventListener("online", warmIfStale);

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => {
        // Просим телефон не выбрасывать сохранённое при нехватке места.
        void navigator.storage?.persist?.().catch(() => {});

        if (Date.now() - lastWarmAt() < WARM_EVERY_MS) return;

        // Не мешаем первому показу экрана: прогрев — через несколько секунд после загрузки.
        timer = window.setTimeout(() => warm(registration), 4000);
      })
      .catch(() => {
        // Воркер не подключился — приложение работает как раньше, без офлайна.
      });

    return () => {
      window.clearTimeout(timer);
      navigator.serviceWorker.removeEventListener("message", onWorkerMessage);
      window.removeEventListener("online", warmIfStale);
    };
  }, [role]);

  // Открыли объект, отчёт, чат или чеклист — через пару секунд просим воркер сохранить копию для работы без сети.
  useEffect(() => {
    if (!canUseWorker() || !isSnapshotPath(pathname) || !navigator.onLine || savesData()) return;

    const timer = window.setTimeout(() => {
      void navigator.serviceWorker.ready.then((registration) => {
        registration.active?.postMessage({ type: "snapshot", path: pathname });
      });
    }, SNAPSHOT_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
