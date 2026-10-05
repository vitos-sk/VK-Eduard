import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Сервис-воркер не должен подолгу застревать в кэше браузера: иначе после деплоя
  // телефоны месяцами сидят на старой версии (см. docs/PWA.md, раздел 5).
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
