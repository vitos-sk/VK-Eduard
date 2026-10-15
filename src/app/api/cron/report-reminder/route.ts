import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { sendReportReminders } from "@/modules/reminders/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Секрет не задан — закрыто для всех, а не открыто: иначе любой мог бы разослать уведомления.
  if (!secret) return false;

  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;

  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

/**
 * Ежедневное напоминание про отчёт. Зовёт планировщик Supabase (`pg_cron`) с заголовком
 * `Authorization: Bearer <CRON_SECRET>`; в браузере и без секрета не работает.
 *
 * Для проверки руками: `?dry=1` — только посчитать, кому ушло бы; `?force=1` — игнорировать «сейчас не 18:00»; `?test=1` — тестовое уведомление всем подписанным.
 */
async function handle(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET не задан" }, { status: 500 });
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;

  try {
    const result = await sendReportReminders(new Date(), {
      force: params.get("force") === "1",
      dryRun: params.get("dry") === "1",
      test: params.get("test") === "1",
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[report-reminder]", error);

    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export { handle as GET, handle as POST };
