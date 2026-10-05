import type { Metadata, Viewport } from "next";
import { Golos_Text, JetBrains_Mono } from "next/font/google";
import "./globals.css";

import { I18nProvider } from "@/lib/i18n/client";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale, getT } from "@/lib/i18n/server";
import { tokens } from "@/design-system/tokens";
import { appleStartupImages } from "@/lib/pwa";

const golos = Golos_Text({
  subsets: ["cyrillic", "latin"],
  variable: "--font-golos",
  display: "swap",
  weight: ["400", "500", "600"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["cyrillic", "latin"],
  variable: "--font-jetbrains",
  display: "swap",
  weight: ["400", "500", "600"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();

  return {
    title: t.common.appName,
    applicationName: t.common.appName,
    description: t.pwa.description,
    // Ярлык на домашнем экране. `apple-touch-icon` лежит в корне `public/`,
    // а не в `app/`: iOS запрашивает `/apple-touch-icon.png` напрямую,
    // не дожидаясь разметки, — так иконка находится в любом случае.
    icons: {
      icon: [
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    },
    // iOS не читает манифест: имя, режим и статус-бар задаются только этими метатегами.
    // Тема светлая, поэтому статус-бар `default` (тёмный текст); шапки и таб-бар
    // всё равно учитывают `env(safe-area-inset-*)` из-за `viewportFit: "cover"`.
    appleWebApp: {
      capable: true,
      title: t.common.appName,
      statusBarStyle: "default",
      startupImage: appleStartupImages,
    },
  };
}

export const viewport: Viewport = {
  themeColor: tokens.paper,
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${golos.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="min-h-full">
        <I18nProvider locale={locale} dict={getDictionary(locale)}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
