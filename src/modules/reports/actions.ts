"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/modules/auth/session";

export type ReportActionState = { error: string | null };

const OK: ReportActionState = { error: null };

export interface ReportInput {
  workDate: string;
  siteId: string | null;
  description: string;
  categoryIds: string[];
}

export interface CreateReportState extends ReportActionState {
  reportId: string | null;
}

/**
 * Перезаписує повний набір категорій звіту: видаляє старі зв'язки і вставляє
 * нові одним запитом — простіше й дешевше за diff, а звітів мало категорій
 * (одиниці), тому зайвої роботи тут не буде.
 */
async function replaceReportCategories(
  supabase: Awaited<ReturnType<typeof createClient>>,
  reportId: string,
  categoryIds: readonly string[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("report_categories")
    .delete()
    .eq("report_id", reportId);

  if (deleteError) throw deleteError;

  if (categoryIds.length === 0) return;

  const { error: insertError } = await supabase
    .from("report_categories")
    .insert(categoryIds.map((categoryId) => ({ report_id: reportId, category_id: categoryId })));

  if (insertError) throw insertError;
}

/** Створює звіт — без жодного поля часу, на відміну від `createManualEntry`. */
export async function createReport(input: ReportInput): Promise<CreateReportState> {
  const profile = await getProfile();

  if (!profile) {
    return { error: t.auth.noProfile, reportId: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_reports")
    .insert({
      client_id: randomUUID(),
      company_id: profile.company_id,
      author_id: profile.id,
      site_id: input.siteId,
      work_date: input.workDate,
      description: input.description,
    })
    .select("id")
    .single();

  if (error) {
    // `reportForm` не має власного ключа помилки збереження — використовуємо
    // той самий загальний текст, що й `createManualEntry` для вставки.
    return { error: t.manualTime.saveError, reportId: null };
  }

  try {
    await replaceReportCategories(supabase, data.id, input.categoryIds);
  } catch {
    return { error: t.manualTime.saveError, reportId: data.id };
  }

  revalidatePath("/", "layout");

  return { error: null, reportId: data.id };
}

/** Повна правка звіту — об'єкт, дата, опис, категорії. */
export async function updateReport(
  reportId: string,
  input: ReportInput,
): Promise<ReportActionState> {
  const profile = await getProfile();

  if (!profile) {
    return { error: t.auth.noProfile };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_reports")
    .update({
      site_id: input.siteId,
      work_date: input.workDate,
      description: input.description,
    })
    .eq("id", reportId)
    .select("id");

  if (error) {
    return { error: t.manualTime.saveError };
  }

  if (!data || data.length === 0) {
    return { error: t.reportDetail.saveRejected };
  }

  try {
    await replaceReportCategories(supabase, reportId, input.categoryIds);
  } catch {
    return { error: t.manualTime.saveError };
  }

  revalidatePath("/", "layout");

  return OK;
}

/** Дозаповнення опису — «Дописати» на картці «Без опису» і правка в деталях. */
export async function updateReportDescription(
  reportId: string,
  description: string,
): Promise<ReportActionState> {
  const profile = await getProfile();

  if (!profile) {
    return { error: t.auth.noProfile };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_reports")
    .update({ description })
    .eq("id", reportId)
    .select("id");

  if (error) {
    return { error: t.reportDetail.saveError };
  }

  if (!data || data.length === 0) {
    return { error: t.reportDetail.saveRejected };
  }

  revalidatePath("/", "layout");

  return OK;
}

/** Правка тільки категорій — окрема секція на детальній сторінці. */
export async function updateReportCategories(
  reportId: string,
  categoryIds: string[],
): Promise<ReportActionState> {
  const profile = await getProfile();

  if (!profile) {
    return { error: t.auth.noProfile };
  }

  const supabase = await createClient();

  try {
    await replaceReportCategories(supabase, reportId, categoryIds);
  } catch {
    return { error: t.reportDetail.saveError };
  }

  revalidatePath("/", "layout");

  return OK;
}

/** Видаляє звіт. Фото видаляються каскадом на рівні бази. */
export async function deleteReport(reportId: string): Promise<ReportActionState> {
  const profile = await getProfile();

  if (!profile) {
    return { error: t.auth.noProfile };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_reports")
    .delete()
    .eq("id", reportId)
    .select("id");

  if (error) {
    return { error: t.hours.deleteError };
  }

  if (!data || data.length === 0) {
    return { error: t.reportDetail.saveRejected };
  }

  revalidatePath("/", "layout");

  return OK;
}
