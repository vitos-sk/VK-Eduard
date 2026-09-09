import type { MetadataRoute } from "next";

import { t } from "@/lib/i18n";

/**
 * Манифест PWA. Next генерирует его сам — отдельный `public/manifest.json` не нужен.
 *
 * `background_color` обязан совпадать с токеном `--bg`: иначе при запуске
 * с домашнего экрана на секунду вспыхивает белый фон — самая заметная примета
 * «это сайт, а не приложение».
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: t.common.appName,
    short_name: t.common.appName,
    description: "Облік робочих годин і звітів",
    lang: "uk",
    id: "/",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#142611",
    theme_color: "#142611",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
