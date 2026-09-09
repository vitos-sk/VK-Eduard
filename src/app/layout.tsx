import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

import { t } from "@/lib/i18n";
import { appleStartupImages } from "@/lib/pwa";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: t.common.appName,
  applicationName: t.common.appName,
  description: "Облік робочого часу та звітів для співробітників K group",
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
  // `black-translucent` вместе с `viewportFit: "cover"` пускает контент под «чёлку»,
  // поэтому шапки и таб-бар обязаны учитывать `env(safe-area-inset-*)`.
  appleWebApp: {
    capable: true,
    title: t.common.appName,
    statusBarStyle: "black-translucent",
    startupImage: appleStartupImages,
  },
};

export const viewport: Viewport = {
  themeColor: "#0d2b08",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uk" className={`dark ${manrope.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
