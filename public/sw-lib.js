/* Чистая логика сервис-воркера: разбор файлов из HTML/CSS, ключи кэша, вытеснение.
 *
 * Лежит отдельно от sw.js, чтобы её можно было проверять тестами (`src/lib/offline/sw-lib.test.ts`):
 * тут нет ни `caches`, ни `fetch`, только строки и числа. Воркер подключает файл через
 * `importScripts("/sw-lib.js")` и берёт функции из `self.VKSW`.
 */
(function (root) {
  /** Бакеты, миниатюры которых храним на телефоне. Фото отчётов (`entry-photos`) сюда НЕ входят. */
  var THUMB_BUCKETS = ["site-photos", "avatars"];

  var STATIC_PREFIX = "/_next/static/";

  /** Пути статики внутри HTML и строк RSC: стоп-символы — кавычки, обратный слэш, пробел, скобки, угловые. */
  var STATIC_IN_TEXT = /\/_next\/static\/[^"'\\\s)(<>]+/g;
  var CSS_URL = /url\(\s*['"]?([^)'"]+)/g;

  /**
   * Все файлы `/_next/static/…`, на которые ссылается текст страницы или CSS.
   * В CSS пути часто относительные (`url(../media/шрифт.woff2)`), поэтому их разрешаем от адреса самого файла.
   * Query (`?dpl=…`) оставляем: браузер просит файл вместе с ней, и ключ в кэше должен совпасть.
   */
  function extractStaticAssets(text, baseUrl) {
    var found = [];
    var seen = {};

    function add(path) {
      if (!seen[path]) {
        seen[path] = true;
        found.push(path);
      }
    }

    var absolute = text.match(STATIC_IN_TEXT) || [];
    for (var i = 0; i < absolute.length; i += 1) add(absolute[i]);

    var match;
    CSS_URL.lastIndex = 0;
    while ((match = CSS_URL.exec(text)) !== null) {
      try {
        var resolved = new URL(match[1], baseUrl);
        if (resolved.pathname.indexOf(STATIC_PREFIX) === 0) add(resolved.pathname + resolved.search);
      } catch {
        /* не адрес (data:, пустая строка) — пропускаем */
      }
    }

    return found;
  }

  function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /** Подписанные ссылки Supabase Storage на файлы указанных бакетов, найденные в тексте страницы. */
  function extractThumbUrls(html, buckets) {
    if (!buckets.length) return [];

    var alternatives = buckets.map(escapeRegExp).join("|");
    var pattern = new RegExp(
      "https:\\/\\/[^\"'\\\\\\s<>)]+\\/storage\\/v1\\/object\\/sign\\/(?:" + alternatives + ")\\/[^\"'\\\\\\s<>)]+",
      "g",
    );
    var found = [];
    var seen = {};
    var matches = html.match(pattern) || [];

    for (var i = 0; i < matches.length; i += 1) {
      var url = matches[i].replace(/&amp;/g, "&");
      if (!seen[url]) {
        seen[url] = true;
        found.push(url);
      }
    }

    return found;
  }

  function isThumbUrl(url, buckets) {
    for (var i = 0; i < buckets.length; i += 1) {
      if (url.pathname.indexOf("/storage/v1/object/sign/" + buckets[i] + "/") === 0) return true;
    }

    return false;
  }

  /** Ключ миниатюры в кэше: сам файл, без токена (токен подписи у каждой ссылки новый). */
  function thumbKey(url) {
    return url.origin + url.pathname;
  }

  /** Кладёт в `<head>` сохранённой копии метку времени: по ней экран узнаёт, что открыт из кэша. */
  function injectSavedAt(html, savedAt) {
    var index = html.indexOf("</head>");
    if (index === -1) return html;

    return html.slice(0, index) + '<meta name="vk-saved-at" content="' + savedAt + '">' + html.slice(index);
  }

  /**
   * Можно ли сохранять ответ как страницу. Редиректы (сессия истекла → /welcome), ошибки и чужие ответы —
   * нет: иначе под адресом `/hours` окажется страница входа.
   */
  function isCacheablePage(res) {
    return res.ok && res.type === "basic" && !res.redirected;
  }

  /** Какие сохранённые страницы удалить, чтобы не-основных (`core: false`) осталось не больше `limit`. Старые — первыми. */
  function pickPageEvictions(entries, limit) {
    var removable = entries
      .filter(function (entry) {
        return !entry.core;
      })
      .sort(function (a, b) {
        return a.savedAt - b.savedAt;
      });
    var excess = removable.length - limit;

    return removable.slice(0, Math.max(0, excess)).map(function (entry) {
      return entry.key;
    });
  }

  /** Ключи сверх лимита; `keys` — в порядке добавления, лишние — самые старые, то есть с начала. */
  function overflowKeys(keys, max) {
    return keys.slice(0, Math.max(0, keys.length - max));
  }

  /**
   * Какие кэши прежних версий удалить. `names` — как у `caches.keys()` (по времени создания), `current` — кэши
   * текущей версии. Прогрев полный — удаляем все прежние. Неполный (какая-то страница не сохранилась) —
   * самую свежую прежнюю версию оставляем запасом, остальные удаляем: иначе одна вечно недоступная страница
   * держала бы старые версии вечно, и с каждым деплоем кэш рос бы.
   */
  function pickStaleCaches(names, current, keepLatest) {
    var prefixes = ["vk-static-", "vk-pages-"];
    var stale = names.filter(function (name) {
      return current.indexOf(name) === -1 && prefixes.some(function (prefix) { return name.indexOf(prefix) === 0; });
    });

    if (!keepLatest) return stale;

    var keep = {};
    prefixes.forEach(function (prefix) {
      var sameKind = stale.filter(function (name) { return name.indexOf(prefix) === 0; });
      if (sameKind.length) keep[sameKind[sameKind.length - 1]] = true;
    });

    return stale.filter(function (name) { return !keep[name]; });
  }

  root.VKSW = {
    THUMB_BUCKETS: THUMB_BUCKETS,
    extractStaticAssets: extractStaticAssets,
    extractThumbUrls: extractThumbUrls,
    isThumbUrl: isThumbUrl,
    thumbKey: thumbKey,
    injectSavedAt: injectSavedAt,
    isCacheablePage: isCacheablePage,
    pickPageEvictions: pickPageEvictions,
    overflowKeys: overflowKeys,
    pickStaleCaches: pickStaleCaches,
  };
})(self);
