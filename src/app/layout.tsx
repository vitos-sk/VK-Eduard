import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "K work",
  description: "Облік робочого часу та звітів для співробітників K work",
  // iOS не читает манифест: имя, режим и статус-бар задаются только этими метатегами.
  // `black-translucent` вместе с `viewportFit: "cover"` пускает контент под «чёлку»,
  // поэтому шапки и таб-бар обязаны учитывать `env(safe-area-inset-*)`.
  appleWebApp: {
    capable: true,
    title: "K work",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#142611",
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
