import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

/**
 * `public/sw-lib.js` — обычный скрипт для воркера (без import/export), поэтому грузим его так же, как воркер:
 * выполняем в пустом контексте и берём то, что он положил в `self.VKSW`.
 */
interface SwLib {
  THUMB_BUCKETS: readonly string[];
  extractStaticAssets(text: string, baseUrl: string): string[];
  extractThumbUrls(html: string, buckets: readonly string[]): string[];
  isThumbUrl(url: URL, buckets: readonly string[]): boolean;
  thumbKey(url: URL): string;
  injectSavedAt(html: string, savedAt: number): string;
  isCacheablePage(res: { ok: boolean; type: string; redirected: boolean }): boolean;
  pickPageEvictions(entries: { key: string; savedAt: number; core: boolean }[], limit: number): string[];
  overflowKeys(keys: readonly string[], max: number): string[];
  pickStaleCaches(names: readonly string[], current: readonly string[], keepLatest: boolean): string[];
}

function loadSwLib(): SwLib {
  const source = readFileSync(path.resolve(__dirname, "../../../public/sw-lib.js"), "utf8");
  const self: { VKSW?: SwLib } = {};

  // В воркере `URL` есть из коробки, в пустом контексте `vm` — нет, поэтому отдаём его сами.
  vm.runInNewContext(source, { self, URL });

  return self.VKSW as SwLib;
}

const lib = loadSwLib();
const SIGNED = "https://p.supabase.co/storage/v1/object/sign";

describe("extractStaticAssets", () => {
  it("берёт пути /_next/static из HTML без повторов, в порядке появления", () => {
    const html =
      '<script src="/_next/static/chunks/a.js"></script><link href="/_next/static/css/b.css">' +
      '<script src="/_next/static/chunks/a.js"></script>';

    expect(lib.extractStaticAssets(html, "https://x.test/")).toEqual([
      "/_next/static/chunks/a.js",
      "/_next/static/css/b.css",
    ]);
  });

  it("находит пути внутри строк RSC (экранированные кавычки)", () => {
    const html = 'self.__next_f.push([1,"{\\"href\\":\\"/_next/static/chunks/c.js\\"}"])';

    expect(lib.extractStaticAssets(html, "https://x.test/")).toEqual(["/_next/static/chunks/c.js"]);
  });

  it("в CSS разрешает относительные url() от адреса файла и пропускает чужие пути", () => {
    const css = "@font-face{src:url(../media/f.woff2)} .x{background:url(/other/x.png)}";

    expect(lib.extractStaticAssets(css, "https://x.test/_next/static/css/b.css")).toEqual([
      "/_next/static/media/f.woff2",
    ]);
  });
});

describe("миниатюры", () => {
  it("extractThumbUrls берёт только бакеты из списка и без повторов", () => {
    const html =
      `<img src="${SIGNED}/site-photos/a/b.webp?token=T1">` +
      `<img src="${SIGNED}/avatars/u.webp?token=T2">` +
      `<img src="${SIGNED}/entry-photos/r.webp?token=T3">` +
      `<img src="${SIGNED}/site-photos/a/b.webp?token=T1">`;

    expect(lib.extractThumbUrls(html, lib.THUMB_BUCKETS)).toEqual([
      `${SIGNED}/site-photos/a/b.webp?token=T1`,
      `${SIGNED}/avatars/u.webp?token=T2`,
    ]);
  });

  it("extractThumbUrls превращает &amp; обратно в &", () => {
    const html = `<img src="${SIGNED}/avatars/u.webp?token=T&amp;x=1">`;

    expect(lib.extractThumbUrls(html, lib.THUMB_BUCKETS)).toEqual([`${SIGNED}/avatars/u.webp?token=T&x=1`]);
  });

  it("isThumbUrl: фото отчётов и остальные запросы — нет", () => {
    expect(lib.isThumbUrl(new URL(`${SIGNED}/entry-photos/a.webp?token=1`), lib.THUMB_BUCKETS)).toBe(false);
    expect(lib.isThumbUrl(new URL(`${SIGNED}/site-photos/a.webp?token=1`), lib.THUMB_BUCKETS)).toBe(true);
    expect(lib.isThumbUrl(new URL("https://p.supabase.co/rest/v1/x"), lib.THUMB_BUCKETS)).toBe(false);
  });

  it("thumbKey отбрасывает токен", () => {
    expect(lib.thumbKey(new URL(`${SIGNED}/avatars/a.webp?token=1`))).toBe(`${SIGNED}/avatars/a.webp`);
  });

  it("в списке бакетов только site-photos и avatars", () => {
    expect([...lib.THUMB_BUCKETS]).toEqual(["site-photos", "avatars"]);
  });
});

describe("страницы", () => {
  it("injectSavedAt вставляет метку перед </head>", () => {
    expect(lib.injectSavedAt("<html><head><title>x</title></head><body></body>", 5)).toContain(
      '<meta name="vk-saved-at" content="5"></head>',
    );
  });

  it("injectSavedAt не меняет HTML без </head>", () => {
    expect(lib.injectSavedAt("<p>нет головы</p>", 5)).toBe("<p>нет головы</p>");
  });

  it("isCacheablePage: только обычный успешный ответ без редиректа", () => {
    expect(lib.isCacheablePage({ ok: true, type: "basic", redirected: false })).toBe(true);
    expect(lib.isCacheablePage({ ok: true, type: "basic", redirected: true })).toBe(false);
    expect(lib.isCacheablePage({ ok: false, type: "basic", redirected: false })).toBe(false);
    expect(lib.isCacheablePage({ ok: true, type: "opaque", redirected: false })).toBe(false);
  });

  it("pickPageEvictions выбрасывает самые старые не-core и не трогает core", () => {
    const entries = [
      { key: "/", savedAt: 1, core: true },
      { key: "/a", savedAt: 2, core: false },
      { key: "/b", savedAt: 3, core: false },
      { key: "/c", savedAt: 4, core: false },
    ];

    expect(lib.pickPageEvictions(entries, 2)).toEqual(["/a"]);
    expect(lib.pickPageEvictions(entries, 3)).toEqual([]);
    expect(lib.pickPageEvictions(entries, 0)).toEqual(["/a", "/b", "/c"]);
  });

  it("overflowKeys отдаёт самые старые сверх лимита", () => {
    expect(lib.overflowKeys(["a", "b", "c", "d"], 3)).toEqual(["a"]);
    expect(lib.overflowKeys(["a", "b"], 3)).toEqual([]);
  });
});

describe("pickStaleCaches", () => {
  // Порядок — как у `caches.keys()`: по времени создания.
  const names = ["vk-static-1", "vk-pages-1", "vk-static-2", "vk-pages-2", "vk-thumbs", "vk-static-3", "vk-pages-3"];
  const current = ["vk-static-3", "vk-pages-3"];

  it("прогрев полный — удаляем все прежние версии, миниатюры не трогаем", () => {
    expect(lib.pickStaleCaches(names, current, false)).toEqual([
      "vk-static-1",
      "vk-pages-1",
      "vk-static-2",
      "vk-pages-2",
    ]);
  });

  it("прогрев неполный — оставляем самую свежую прежнюю версию как запас, остальные удаляем", () => {
    expect(lib.pickStaleCaches(names, current, true)).toEqual(["vk-static-1", "vk-pages-1"]);
  });

  it("прежних версий нет — удалять нечего", () => {
    expect(lib.pickStaleCaches(["vk-thumbs", ...current], current, true)).toEqual([]);
    expect(lib.pickStaleCaches(["vk-thumbs", ...current], current, false)).toEqual([]);
  });
});
