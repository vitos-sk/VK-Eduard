/* Сервис-воркер «VK group»: приложение открывается без интернета.
 *
 * Что хранится на телефоне:
 *  - статика (/_next/static, иконки) — сначала кэш: файлы с хэшем в имени не меняются;
 *  - страницы — сначала сеть, а при её отсутствии (или очень медленной связи, если копия уже есть) —
 *    последняя сохранённая копия. Основные экраны воркер скачивает заранее по списку от приложения
 *    («прогрев»), а страницы-детали (объект, отчёт, чат…) — когда человек их открыл («недавние», 30 штук);
 *  - миниатюры: фото объектов и аватары (бакеты `site-photos`, `avatars`) — по пути файла, без токена подписи.
 *    Фото отчётов (`entry-photos`) НЕ кэшируются: онлайн они показываются как есть, без сети их нет;
 *  - /offline.html — запасная страница, если открыть нечего.
 *
 * Что НЕ кэшируется: запросы к Supabase (чужой домен, кроме миниатюр), /api/*, любые не-GET.
 * Данными управляет само приложение (IndexedDB + очередь «не відправлено»).
 *
 * Версия = номер сборки (`/sw-version.js`): каждый деплой меняет её, браузер видит новый воркер.
 * Старые копии удаляются только после того, как все основные страницы новой версии сохранены,
 * иначе страница прежней версии осталась бы без своих скриптов. Не сохранилась какая-то страница —
 * одна прежняя версия остаётся запасом, остальные удаляются (кэш не растёт с каждым деплоем).
 *
 * Чистая логика (разбор файлов, ключи, вытеснение) — в `sw-lib.js`, она покрыта тестами.
 */
importScripts("/sw-lib.js", "/sw-version.js");

const {
  THUMB_BUCKETS,
  extractStaticAssets,
  extractThumbUrls,
  isThumbUrl,
  thumbKey,
  injectSavedAt,
  isCacheablePage,
  pickPageEvictions,
  overflowKeys,
  pickStaleCaches,
} = self.VKSW;

const VERSION = self.VK_VERSION;
const STATIC_CACHE = `vk-static-${VERSION}`;
const PAGES_CACHE = `vk-pages-${VERSION}`;
/** Миниатюры не зависят от версии: файл по пути не меняется (при замене фото путь новый). */
const THUMBS_CACHE = "vk-thumbs";
const OFFLINE_URL = "/offline.html";

/** Если копия страницы есть, а сеть молчит дольше — показываем копию. */
const SLOW_NETWORK_MS = 2500;
/** Страницу-деталь пересохраняем не чаще, чем раз в это время. */
const SNAPSHOT_FRESH_MS = 1000 * 60 * 60 * 6;
/** Сколько «недавних» (не основных) страниц храним. */
const RECENT_PAGES_LIMIT = 30;
/** Сколько миниатюр храним; лишние (самые старые) удаляются. */
const MAX_THUMBS = 600;
/** Пауза между страницами при прогреве: не грузим сервер и канал разом. */
const WARM_PAUSE_MS = 300;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Меняется при выходе из аккаунта: прогрев, начатый до выхода, увидит это и перестанет сохранять. */
let generation = 0;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES_CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting()),
  );
});

function isOtherVersionCache(name) {
  return (
    (name.startsWith("vk-static-") && name !== STATIC_CACHE) ||
    (name.startsWith("vk-pages-") && name !== PAGES_CACHE)
  );
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const hadOtherVersion = (await caches.keys()).some(isOtherVersionCache);

      await self.clients.claim();

      // Старые копии здесь НЕ удаляем (до конца прогрева они ещё нужны) — просим приложение сделать прогрев.
      if (hadOtherVersion) {
        const windows = await self.clients.matchAll({ type: "window" });
        for (const client of windows) client.postMessage({ type: "sw-updated" });
      }
    })(),
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
  return url.origin + url.pathname;
}

/** Ищем сначала в кэше текущей версии: общий `caches.match` отдаёт самую старую версию первой. */
async function matchIn(cacheName, key) {
  // `ignoreVary`: Next отвечает с `Vary: rsc, next-router-…`, а ключ у нас без этих заголовков.
  const options = { ignoreVary: true };
  const current = await (await caches.open(cacheName)).match(key, options);

  return current || (await caches.match(key, options));
}

/* ── Страницы ─────────────────────────────────────────────────────────────── */

/**
 * Сохраняет страницу: добавляет в <head> метку времени (по ней экран узнаёт, что открыт из кэша) и
 * заголовки `x-vk-saved-at` / `x-vk-core`. `core` — основная страница прогрева, её не вытесняют.
 * Ошибка записи (нет места, обрыв) не должна ломать открытие страницы, поэтому глотаем её.
 */
async function storePage(key, response, core) {
  try {
    const html = await response.text();
    const savedAt = Date.now();
    const headers = new Headers(response.headers);

    // Тело мы пересобрали (декодировано и дополнено), эти заголовки описывают прежнее тело.
    headers.delete("content-length");
    headers.delete("content-encoding");
    headers.delete("transfer-encoding");
    headers.set("x-vk-saved-at", String(savedAt));
    headers.set("x-vk-core", core ? "1" : "0");

    const cache = await caches.open(PAGES_CACHE);
    await cache.put(
      key,
      new Response(injectSavedAt(html, savedAt), {
        status: response.status,
        statusText: response.statusText,
        headers,
      }),
    );

    if (!core) await trimRecentPages();
  } catch {
    /* не критично: страница просто не сохранится */
  }
}

/** Оставляет не больше RECENT_PAGES_LIMIT «недавних» страниц текущей версии. */
async function trimRecentPages() {
  const cache = await caches.open(PAGES_CACHE);
  const entries = [];

  for (const request of await cache.keys()) {
    if (new URL(request.url).pathname === OFFLINE_URL) continue;

    const response = await cache.match(request);
    if (!response) continue;

    entries.push({
      key: request.url,
      savedAt: Number(response.headers.get("x-vk-saved-at")) || 0,
      core: response.headers.get("x-vk-core") === "1",
    });
  }

  for (const key of pickPageEvictions(entries, RECENT_PAGES_LIMIT)) await cache.delete(key);
}

async function offlineFallback() {
  return (await matchIn(PAGES_CACHE, OFFLINE_URL)) || Response.error();
}

async function networkFirstPage(event) {
  const { request } = event;
  const key = pageKey(new URL(request.url));

  let cached = null;
  try {
    cached = await matchIn(PAGES_CACHE, key);
  } catch {
    /* кэш недоступен — работаем как обычный сайт */
  }

  const network = fetch(request);
  const core = cached ? cached.headers.get("x-vk-core") === "1" : false;

  // Свежий ответ сохраняем всегда, даже если копию мы уже показали (сеть ответила поздно).
  event.waitUntil(
    network
      .then((response) => (isCacheablePage(response) ? storePage(key, response.clone(), core) : undefined))
      .catch(() => {}),
  );

  if (!cached) {
    try {
      return await network;
    } catch {
      return offlineFallback();
    }
  }

  try {
    const response = await Promise.race([
      network,
      new Promise((_, reject) => setTimeout(() => reject(new Error("slow")), SLOW_NETWORK_MS)),
    ]);

    // Сервер не отвечает (502/503/504 от краевой сети) — копия лучше ошибки.
    return response.status >= 500 ? cached : response;
  } catch {
    return cached;
  }
}

/* ── Статика ──────────────────────────────────────────────────────────────── */

async function staticFirst(request) {
  const cached = await matchIn(STATIC_CACHE, request);
  if (cached) return cached;

  const response = await fetch(request);

  if (response.ok) {
    try {
      await (await caches.open(STATIC_CACHE)).put(request, response.clone());
    } catch {
      /* нет места — отдадим без сохранения */
    }
  }

  return response;
}

/* ── Миниатюры ────────────────────────────────────────────────────────────── */

/** Сохраняет миниатюру под ключом без токена и подчищает самые старые сверх лимита. */
async function saveThumb(cache, key, response) {
  try {
    await cache.put(key, response);

    const keys = (await cache.keys()).map((request) => request.url);
    for (const extra of overflowKeys(keys, MAX_THUMBS)) await cache.delete(extra);
  } catch {
    /* нет места или ответ нельзя хранить (Vary: *) — не критично */
  }
}

/**
 * Берём с телефона, а нет — из сети. Запрашиваем в режиме `cors`: «непрозрачные» ответы (`no-cors`) Chrome
 * считает в квоте примерно по 7 МБ каждый. `ignoreVary` — у Supabase может быть `Vary: Origin`, а ключ у нас
 * без заголовков.
 */
async function thumbFirst(event) {
  const url = new URL(event.request.url);
  const key = thumbKey(url);
  const cache = await caches.open(THUMBS_CACHE);
  const cached = await cache.match(key, { ignoreVary: true });

  if (cached) return cached;

  try {
    const response = await fetch(url.href, { mode: "cors", credentials: "omit" });

    if (response.ok) event.waitUntil(saveThumb(cache, key, response.clone()));

    return response;
  } catch {
    return Response.error();
  }
}

async function cacheThumb(url, cache) {
  const key = thumbKey(new URL(url));
  if (await cache.match(key, { ignoreVary: true })) return;

  try {
    const response = await fetch(url, { mode: "cors", credentials: "omit" });
    if (response.ok) await saveThumb(cache, key, response);
  } catch {
    /* ссылка протухла или нет связи — миниатюра сохранится, когда её откроют */
  }
}

/* ── Fetch ────────────────────────────────────────────────────────────────── */

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Миниатюры лежат на чужом домене (Storage), поэтому проверка выше «тот же origin».
  if (request.destination === "image" && isThumbUrl(url, THUMB_BUCKETS)) {
    event.respondWith(thumbFirst(event));
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (isStaticAsset(url.pathname)) {
    event.respondWith(staticFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(event));
  }
});

/* ── Прогрев и «недавние» ─────────────────────────────────────────────────── */

/** Кладёт файл в кэш статики текущей версии; берёт из прежней версии, если там уже есть (не качаем заново). */
async function cacheAsset(asset, statics) {
  if (await statics.match(asset)) return null;

  let response = await caches.match(asset);

  if (!response) {
    response = await fetch(asset);
    if (!response.ok) return null;
  }

  await statics.put(asset, response.clone());

  return response;
}

/** Скачивает файлы страницы; из CSS достаёт ещё и шрифты (на уровень глубже CSS не идём). */
async function cacheAssets(assets, statics, gen) {
  await Promise.all(
    assets.map(async (asset) => {
      try {
        if (gen !== generation) return;

        const response = await cacheAsset(asset, statics);
        if (!response || !/\.css(\?|$)/.test(asset)) return;

        const nested = extractStaticAssets(await response.text(), self.location.origin + asset);
        await Promise.all(
          nested.map((path) =>
            gen === generation ? cacheAsset(path, statics).catch(() => {}) : undefined,
          ),
        );
      } catch {
        /* не критично: докачается при обычном открытии */
      }
    }),
  );
}

/** Сохраняет страницу вместе с её скриптами, шрифтами и миниатюрами. `false` — страницу сохранить не удалось. */
async function fetchAndStore(path, gen, core) {
  try {
    const response = await fetch(path, { credentials: "same-origin" });

    // Редирект (сессия истекла → /welcome) и ошибки под адресом страницы сохранять нельзя.
    if (!isCacheablePage(response)) return false;

    const html = await response.clone().text();
    if (gen !== generation) return false;

    const origin = self.location.origin;
    await storePage(pageKey(new URL(path, origin)), response, core);

    const statics = await caches.open(STATIC_CACHE);
    await cacheAssets(extractStaticAssets(html, origin + path), statics, gen);

    if (gen === generation) {
      const thumbs = await caches.open(THUMBS_CACHE);
      await Promise.all(extractThumbUrls(html, THUMB_BUCKETS).map((url) => cacheThumb(url, thumbs)));
    }

    return true;
  } catch {
    return false;
  }
}

/** `keepLatest` — прогрев неполный: самую свежую прежнюю версию оставляем запасом (см. `pickStaleCaches`). */
async function pruneOldVersions(keepLatest) {
  const stale = pickStaleCaches(await caches.keys(), [STATIC_CACHE, PAGES_CACHE], keepLatest);
  await Promise.all(stale.map((name) => caches.delete(name)));
}

async function runWarm(paths) {
  const gen = generation;
  let allSaved = true;

  for (const path of paths) {
    if (gen !== generation) return;

    if (!(await fetchAndStore(path, gen, true))) allSaved = false;

    await sleep(WARM_PAUSE_MS);
  }

  // Старые копии убираем полностью, только если новые сохранены целиком; иначе остаётся одна прежняя версия
  // как запас. И только если в это время никто не вышел из аккаунта.
  if (gen === generation) await pruneOldVersions(!allSaved);
}

let warming = null;
let warmingGeneration = -1;

/** Один прогрев за раз. Если между тем был выход из аккаунта — новый прогрев ждёт, пока прежний свернётся. */
function warm(paths) {
  if (warming && warmingGeneration === generation) return warming;

  const previous = warming || Promise.resolve();
  warmingGeneration = generation;

  const run = previous.catch(() => {}).then(() => runWarm(paths));
  warming = run;
  run.finally(() => {
    if (warming === run) warming = null;
  });

  return run;
}

/** Сохраняет страницу-деталь, которую человек только что открыл онлайн (не основную: такие вытесняются). */
async function snapshot(path) {
  const key = pageKey(new URL(path, self.location.origin));
  const existing = await matchIn(PAGES_CACHE, key);

  if (existing && Date.now() - (Number(existing.headers.get("x-vk-saved-at")) || 0) < SNAPSHOT_FRESH_MS) return;

  await fetchAndStore(path, generation, existing ? existing.headers.get("x-vk-core") === "1" : false);
}

/** Выход из аккаунта: страницы (в них данные пользователя) и миниатюры стираются. Статика — нет: в ней личного нет. */
async function clearUserData() {
  generation += 1;

  const names = await caches.keys();
  await Promise.all(
    names.filter((name) => name.startsWith("vk-pages-") || name === THUMBS_CACHE).map((name) => caches.delete(name)),
  );

  try {
    await (await caches.open(PAGES_CACHE)).add(OFFLINE_URL);
  } catch {
    /* без связи запасная страница вернётся при следующей установке */
  }
}

/** Только пути внутри сайта. */
function isSitePath(path) {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//");
}

self.addEventListener("message", (event) => {
  const data = event.data || {};

  if (data.type === "warm" && Array.isArray(data.paths)) {
    event.waitUntil(warm(data.paths.filter(isSitePath)));
  }

  if (data.type === "snapshot" && isSitePath(data.path)) event.waitUntil(snapshot(data.path));
  if (data.type === "clear") event.waitUntil(clearUserData());
});

/* ── Push-напоминания ─────────────────────────────────────────────────────────
 * Сервер шлёт JSON { title, body, url, tag }. `tag` — одно и то же напоминание заменяет предыдущее,
 * а не копится стопкой. По нажатию открываем (или фокусируем) приложение на нужном экране.
 */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    /* пришёл не JSON — покажем общий текст ниже */
  }

  const title = data.title || "VK group";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag || "vk-reminder",
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const path = (event.notification.data && event.notification.data.url) || "/";
  // Только путь внутри сайта: уведомление не должно уводить на чужой адрес.
  const target = new URL(path.startsWith("/") && !path.startsWith("//") ? path : "/", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          return client.focus().then((focused) => ("navigate" in focused ? focused.navigate(target) : focused));
        }
      }

      return self.clients.openWindow(target);
    }),
  );
});
