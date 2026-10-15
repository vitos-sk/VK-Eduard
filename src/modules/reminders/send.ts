import "server-only";

import webpush from "web-push";

import { createAdminClient } from "@/lib/supabase/admin";

import { brusselsClock, isReminderHour, pickRecipients, type Candidate } from "./schedule";
import { REMINDER_URL, reminderText, testText } from "./texts";

export interface ReminderResult {
  /** Почему ничего не отправлено, если не отправлено. */
  skipped?: "not-18-brussels";
  date: string;
  /** Сколько устройств получило / не получило уведомление. */
  sent: number;
  failed: number;
  /** Подписки, которые браузер отозвал (удалены). */
  removed: number;
  /** Режим проверки: кому ушло бы, без отправки. */
  dryRun: boolean;
}

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    throw new Error("Не заданы NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT.");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

/**
 * Рассылает напоминание «внесите отчёт». Вызывается планировщиком (см. `supabase/cron-report-reminder.sql`).
 *
 * `force` — игнорировать «сейчас не 18:00» (для проверки руками); `dryRun` — ничего не слать, только посчитать;
 * `test` — слать тестовое уведомление всем подписанным активным (без учёта «уже внёс отчёт» и «уже слали сегодня»),
 * при этом `last_sent_on` не трогается — настоящее вечернее напоминание не пропадёт.
 */
export async function sendReportReminders(
  now: Date,
  options: { force?: boolean; dryRun?: boolean; test?: boolean } = {},
): Promise<ReminderResult> {
  const { dateKey } = brusselsClock(now);
  const dryRun = Boolean(options.dryRun);
  const empty = { date: dateKey, sent: 0, failed: 0, removed: 0, dryRun };

  const isTest = Boolean(options.test);

  if (!isTest && !options.force && !isReminderHour(now)) {
    return { ...empty, skipped: "not-18-brussels" };
  }

  const admin = createAdminClient();

  const { data: subs, error: subsError } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth, locale, last_sent_on");
  if (subsError) throw new Error(`push_subscriptions: ${subsError.message}`);
  if (!subs.length) return empty;

  const userIds = [...new Set(subs.map((sub) => sub.user_id))];

  const [{ data: profiles, error: profilesError }, { data: reports, error: reportsError }] = await Promise.all([
    admin.from("profiles").select("id, role, is_active").in("id", userIds),
    admin.from("site_reports").select("author_id").eq("work_date", dateKey).in("author_id", userIds),
  ]);
  if (profilesError) throw new Error(`profiles: ${profilesError.message}`);
  if (reportsError) throw new Error(`site_reports: ${reportsError.message}`);

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const reported = new Set(reports.map((report) => report.author_id));

  // Решение «слать ли человеку» — по каждому устройству отдельно только в части «уже слали сегодня».
  const targets = subs.filter((sub) => {
    const profile = profileById.get(sub.user_id);
    if (!profile) return false;
    if (isTest) return profile.is_active;

    const candidate: Candidate = {
      userId: sub.user_id,
      role: profile.role,
      isActive: profile.is_active,
      reportedToday: reported.has(sub.user_id),
      lastSentOn: sub.last_sent_on,
    };

    return pickRecipients([candidate], dateKey).length > 0;
  });

  if (dryRun) return { ...empty, sent: targets.length };
  if (!targets.length) return empty;

  configureWebPush();

  let sent = 0;
  let failed = 0;
  const gone: string[] = [];
  const delivered: string[] = [];

  await Promise.all(
    targets.map(async (sub) => {
      const text = isTest ? testText(sub.locale) : reminderText(sub.locale);
      const payload = JSON.stringify(
        isTest
          ? { title: text.title, body: text.body, url: "/", tag: "report-reminder-test" }
          : { title: text.title, body: text.body, url: REMINDER_URL, tag: "report-reminder" },
      );

      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          // Не доставилось за 2 часа (телефон выключен) — уже не нужно: вечернее напоминание ночью бессмысленно.
          { TTL: 2 * 60 * 60, urgency: "high" },
        );
        sent += 1;
        delivered.push(sub.id);
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;

        // 404/410 — браузер отозвал подписку (приложение удалено, разрешение снято): чистим, чтобы не стучаться вечно.
        if (status === 404 || status === 410) gone.push(sub.id);
        failed += 1;
      }
    }),
  );

  if (delivered.length && !isTest) {
    await admin.from("push_subscriptions").update({ last_sent_on: dateKey }).in("id", delivered);
  }
  if (gone.length) {
    await admin.from("push_subscriptions").delete().in("id", gone);
  }

  return { ...empty, sent, failed, removed: gone.length };
}
