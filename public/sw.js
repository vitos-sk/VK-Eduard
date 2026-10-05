/* Сервис-воркер «VK group»: приложение открывается без интернета.
 *
 * Что кэшируется:
 *  - статика (/_next/static, иконки) — сначала кэш: файлы с хэшем в имени не меняются;
 *  - страницы (переходы по адресу) — сначала сеть, при её отсутствии (или очень медленной связи,
 *    если копия уже есть) — последняя сохранённая копия;
 *  - /offline.html — запасная страница, если открыть нечего.
 *
 * Что НЕ кэшируется: запросы к Supabase (чужой домен), /api/*, любые не-GET.
 * Данными управляет само приложение (IndexedDB + очередь «не відправлено»), поэтому
 * второго кэша на те же данные здесь нет.
 *
 * Меняете логику — поднимайте VERSION: старые кэши удалятся при активации.
 */
const VERSION = "v1";
const STATIC_CACHE = `vk-static-${VERSION}`;
const PAGES_CACHE = `vk-pages-${VERSION}`;
const OFFLINE_URL = "/offline.html";

/** Если копия страницы есть, а сеть молчит дольше — показываем копию. */
const SLOW_NETWORK_MS = 4000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES_CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("vk-") && key !== STATIC_CACHE && key !== PAGES_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/splash/") ||
    pathname === "/apple-touch-icon.png" ||
    pathname === "/favicon.ico"
  );
}

/** Ключ страницы в кэше — только путь, без query. */
function pageKey(url) {
  return new Request(url.origin + url.pathname);
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());

  return response;
}

async function networkFirstPage(request) {
  const url = new URL(request.url);
  const cache = await caches.open(PAGES_CACHE);
  const cached = await cache.match(pageKey(url));

  try {
    const network = fetch(request);
    const response = cached
      ? await Promise.race([
          network,
          new Promise((_, reject) => setTimeout(() => reject(new Error("slow")), SLOW_NETWORK_MS)),
        ])
      : await network;

    // Кэшируем только нормальные ответы: редиректы (например, на /welcome) и ошибки — нет.
    if (response.ok && response.type === "basic" && !response.redirected) {
      cache.put(pageKey(url), response.clone());
    }

    return response;
  } catch {
    return cached || (await cache.match(OFFLINE_URL)) || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
  }
});

/** Заранее сохраняет страницы и их скрипты, чтобы они открылись без интернета с первого раза. */
async function warm(paths) {
  const pages = await caches.open(PAGES_CACHE);
  const statics = await caches.open(STATIC_CACHE);

  for (const path of paths) {
    try {
      const response = await fetch(path, { credentials: "same-origin" });
      if (!response.ok || response.redirected) continue;

      const html = await response.clone().text();
      await pages.put(new Request(self.location.origin + path), response);

      const assets = new Set(html.match(/\/_next\/static\/[^"'\\\s)]+/g) || []);
      await Promise.all(
        [...assets].map(async (asset) => {
          if (await statics.match(asset)) return;

          try {
            const assetResponse = await fetch(asset);
            if (assetResponse.ok) await statics.put(asset, assetResponse);
          } catch {
            /* не критично: докачается при обычном открытии */
          }
        }),
      );
    } catch {
      /* нет связи — повторим при следующем запуске */
    }
  }
}

/** Удаляет сохранённые страницы (при выходе из аккаунта: в них данные пользователя). */
async function clearPages() {
  await caches.delete(PAGES_CACHE);
  const cache = await caches.open(PAGES_CACHE);
  await cache.add(OFFLINE_URL);
}

self.addEventListener("message", (event) => {
  const data = event.data || {};

  if (data.type === "warm" && Array.isArray(data.paths)) event.waitUntil(warm(data.paths));
  if (data.type === "clear") event.waitUntil(clearPages());
});
