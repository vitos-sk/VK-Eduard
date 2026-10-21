import type { NextConfig } from "next";

/**
 * Имена переменных Supabase: свои (`NEXT_PUBLIC_SUPABASE_*`) или те, что создаёт интеграция
 * Vercel ↔ Supabase (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_ANON_KEY`).
 * Браузеру доступно только то, что вшито при сборке, поэтому подставляем здесь.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  "";

/**
 * Номер сборки: хеш коммита на Vercel, локально — время запуска. Попадает в `/sw-version.js`
 * (см. `src/app/sw-version.js/route.ts`), и по нему телефон понимает, что вышла новая версия приложения.
 */
const buildId = process.env.VERCEL_GIT_COMMIT_SHA ?? String(Date.now());

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabaseKey,
    NEXT_PUBLIC_BUILD_ID: buildId,
  },
  // Сервис-воркер и его подключаемый файл `sw-lib.js` не должны подолгу застревать в кэше браузера:
  // иначе после деплоя телефоны месяцами сидят на старой версии (см. docs/PWA.md, раздел 4).
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/sw-lib.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
  // PDF-табель (`api/export`) вшиває кирилічний шрифт із файлу — трейсер
  // Next інколи не бачить `fs.readFileSync(process.cwd() + ...)` сам,
  // тож на Vercel serverless-функція лишиться без файлу без цього рядка.
  outputFileTracingIncludes: {
    "/api/export": ["./assets/fonts/**/*"],
  },
};

export default nextConfig;
