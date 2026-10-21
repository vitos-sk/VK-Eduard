import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUser } from "@/modules/notifications/notify";

import { reportCreatedPushText, reportUrl } from "./texts";

interface NewReport {
  id: string;
  companyId: string;
  authorId: string;
  authorName: string;
  siteId: string | null;
}

/**
 * Сообщает шефам фирмы (всем активным), что сотрудник создал звіт. Сам автор уведомление не получает —
 * если отчёт создал шеф, пушить ему о своём же отчёте незачем.
 *
 * Отчёт уже сохранён, поэтому любая ошибка здесь (нет ключей, база недоступна) только пишется в лог и
 * не должна ломать сохранение. Ждём до конца: на serverless-хостинге функция завершается вместе с ответом.
 */
export async function notifyBossesAboutReport(report: NewReport): Promise<void> {
  try {
    const admin = createAdminClient();

    const [{ data: bosses, error }, { data: site }] = await Promise.all([
      admin.from("profiles").select("id").eq("company_id", report.companyId).eq("role", "boss").eq("is_active", true),
      report.siteId ? admin.from("sites").select("name").eq("id", report.siteId).maybeSingle() : Promise.resolve({ data: null }),
    ]);

    if (error) throw error;

    const recipients = (bosses ?? []).filter((boss) => boss.id !== report.authorId);

    const outcomes = await Promise.all(
      recipients.map((boss) =>
        notifyUser(boss.id, null, (locale) => ({
          ...reportCreatedPushText(locale, { name: report.authorName, site: site?.name ?? null }),
          url: reportUrl(report.id),
          // Один тег на отчёт: повторная отправка заменяет уведомление, а не копит стопку.
          tag: `report-${report.id}`,
        })),
      ),
    );

    // Одна строка в журнале сервера на отчёт: видно, сколько шефов, сколько у них подписанных телефонов и дошло ли.
    const devices = outcomes.reduce((sum, outcome) => sum + (outcome?.devices ?? 0), 0);
    const sent = outcomes.reduce((sum, outcome) => sum + (outcome?.sent ?? 0), 0);
    console.info("[notify-bosses]", { report: report.id, bosses: recipients.length, devices, sent });
  } catch (error) {
    console.error("[notify-bosses]", error);
  }
}
