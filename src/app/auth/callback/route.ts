import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/modules/auth/redirect";

/**
 * Куда приходит пользователь по ссылке из письма (сброс пароля). Supabase присылает `?code=` (обычный
 * вход через PKCE) или `?token_hash=&type=` (если шаблон письма настроен на такой вариант) —
 * меняем это на сессию и отправляем на `next` (по умолчанию — форму нового пароля).
 * Не получилось (ссылка устарела, открыта в другом браузере) — на «Забули пароль?» с пояснением.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next"), "/reset-password");

  const supabase = await createClient();
  let ok = false;

  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  }

  return NextResponse.redirect(`${origin}${ok ? next : "/forgot-password?error=link"}`);
}
