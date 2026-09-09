import type { MetadataRoute } from "next";

import { t } from "@/lib/i18n";

/**
 * Манифест PWA. Next генерирует его сам — отдельный `public/manifest.json` не нужен.
 *
 * `background_color` обязан совпадать с токеном `--bg`: иначе при запуске
 * с домашнего экрана на секунду вспыхивает белый фон — самая заметная примета
 * «это сайт, а не приложение».
 *
 * Файлы иконок собирает `scripts/generate-app-icons.mjs` из знака в
 * `src/components/brand/Logo.tsx`. Руками их не правим.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: t.common.appName,
    short_name: t.common.appName,
    description: t.pwa.description,
    lang: "uk",
    dir: "ltr",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#142611",
    theme_color: "#142611",
    categories: ["business", "productivity"],
    /**
     * `any` и `maskable` — разные картинки, а не одна с двумя целями:
     * маскируемую Android режет под форму лаунчера и гарантирует только
     * центральный круг в 80%, поэтому знак в ней мельче.
     */
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-1024.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    /** Долгое нажатие на ярлык в Android: три частых действия без прохода по экранам. */
    shortcuts: [
      {
        name: t.pwa.shortcuts.hours.name,
        description: t.pwa.shortcuts.hours.description,
        url: "/hours",
        icons: [
          { src: "/icons/shortcut-hours.png", sizes: "96x96", type: "image/png" },
        ],
      },
      {
        name: t.pwa.shortcuts.newReport.name,
        description: t.pwa.shortcuts.newReport.description,
        url: "/reports/new",
        icons: [
          {
            src: "/icons/shortcut-report.png",
            sizes: "96x96",
            type: "image/png",
          },
        ],
      },
      {
        name: t.pwa.shortcuts.manualTime.name,
        description: t.pwa.shortcuts.manualTime.description,
        url: "/time/manual",
        icons: [
          { src: "/icons/shortcut-timer.png", sizes: "96x96", type: "image/png" },
        ],
      },
    ],
  };
}
