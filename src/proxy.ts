import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/** Пути, открытые без входа. Всё остальное — за логином. */
const PUBLIC_PATHS = ["/welcome", "/login", "/auth"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * В Next 16 `middleware.ts` переименован в `proxy.ts` — гайды Supabase
 * пока пишут по-старому, поведение то же.
 *
 * Делает три вещи:
 * 1. Обновляет протухший access-токен и записывает свежие куки в ответ.
 *    Без этого сессия живёт час и рабочего выкидывает посреди смены.
 * 2. Отправляет неавторизованного на `/welcome`, а вошедшего — с welcome
 *    и логина на главную.
 * 3. Кладёт проверенный id пользователя в заголовок `x-user-id` для
 *    страницы — `getProfile()` берёт его вместо повторного getUser().
 *    Без этого каждый переход между вкладками ходил в Supabase Auth за
 *    одной и той же проверкой токена дважды (тут и в `session.ts`) — это
 *    и было главной причиной медленной навигации.
 *
 * Это оптимистичная проверка, а не авторизация: данные закрывает RLS.
 */
export async function proxy(request: NextRequest) {
  const pendingCookies: {
    name: string;
    value: string;
    options?: Parameters<
      InstanceType<typeof NextResponse>["cookies"]["set"]
    >[2];
  }[] = [];
  let refreshHeaders: Record<string, string> = {};

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        pendingCookies.push(...cookiesToSet);
        // Ответ с новыми куками сессии не должен попасть в кэш CDN:
        // иначе чужой токен уедет другому пользователю.
        refreshHeaders = headers;
      },
    },
  });

  // getClaims(), а не getSession(): подпись токена проверяется по публичным ключам проекта
  // (кэшируются), без похода в Supabase Auth на каждый запрос — это ~130 мс на каждый переход.
  // Для проектов на старом симметричном ключе getClaims() сам откатывается на getUser().
  // getSession() верит куке на слово, а куку можно подделать — его не используем.
  const { data: claimsData } = await supabase.auth.getClaims();
  let userId = claimsData?.claims?.sub ?? null;

  // Страховка: если токен локально не подтвердился (нет кук, протух, ключи не получены) —
  // один раз спрашиваем сервер Supabase. Платят за это только невошедшие, а вошедший
  // никогда не окажется выброшенным на /welcome из-за сбоя локальной проверки.
  if (!userId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    userId = user?.id ?? null;
  }

  const { pathname } = request.nextUrl;

  if (!userId && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/welcome";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (userId && (pathname === "/welcome" || pathname === "/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Заголовок ставим здесь и только здесь — клиент не может подделать
  // его своим запросом, потому что `Headers.set` ниже всегда перезаписывает
  // то, что пришло снаружи.
  const requestHeaders = new Headers(request.headers);
  if (userId) {
    requestHeaders.set("x-user-id", userId);
  } else {
    requestHeaders.delete("x-user-id");
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  for (const { name, value, options } of pendingCookies) {
    response.cookies.set(name, value, options);
  }
  for (const [key, headerValue] of Object.entries(refreshHeaders)) {
    response.headers.set(key, headerValue);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Все пути, кроме статики и картинок. Иконки, манифест, сервис-воркер и запасная офлайн-страница тоже исключены:
     * гонять их через проверку сессии — лишний запрос к Supabase на каждый файл.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
