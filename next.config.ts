import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PDF-табель (`api/export`) вшиває кирилічний шрифт із файлу — трейсер
  // Next інколи не бачить `fs.readFileSync(process.cwd() + ...)` сам,
  // тож на Vercel serverless-функція лишиться без файлу без цього рядка.
  outputFileTracingIncludes: {
    "/api/export": ["./assets/fonts/**/*"],
  },
};

export default nextConfig;
