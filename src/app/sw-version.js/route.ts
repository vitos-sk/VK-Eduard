export const dynamic = "force-dynamic";

/**
 * Номер сборки для сервис-воркера (`public/sw.js` подключает его через `importScripts`).
 *
 * Сам `sw.js` между деплоями не меняется, а браузер обновляет воркер, только если изменился его файл или
 * любой подключённый скрипт. Поэтому номер сборки лежит здесь: новый деплой → новый номер → телефон видит
 * обновление, сохраняет свежие страницы и удаляет старые копии. Номер задаёт `next.config.ts`.
 *
 * Файл нельзя кэшировать: подключённые скрипты браузер по умолчанию берёт из HTTP-кэша, и без `no-store`
 * телефон месяцами не узнал бы о новой версии. Прокси (`proxy.ts`) этот путь не трогает — иначе у вышедшего
 * из аккаунта обновление воркера получило бы редирект на `/welcome`.
 */
export async function GET() {
  const version = process.env.NEXT_PUBLIC_BUILD_ID || "dev";

  return new Response(`self.VK_VERSION = ${JSON.stringify(version)};\n`, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
