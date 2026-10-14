import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Принудительный выход: сюда `requireProfile()` отправляет того, у кого есть сессия, но нет активного профиля.
 * Стираем куки сессии и ведём на `/welcome` — иначе прокси вернул бы его обратно на `/` (бесконечный редирект).
 * `/auth/*` прокси не обрабатывает, поэтому цикла здесь быть не может.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/welcome", request.url));
}
