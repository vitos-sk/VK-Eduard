"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { t } from "@/lib/i18n";
import { companyStrings } from "@/lib/i18n/parts/company";
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
    return { error: t.reportForm.saveError, reportId: null };
  }

  try {
    await replaceReportCategories(supabase, data.id, input.categoryIds);
  } catch {
    return { error: t.reportForm.saveError, reportId: data.id };
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
    return { error: t.reportForm.saveError };
  }

  if (!data || data.length === 0) {
    return { error: t.reportDetail.saveRejected };
  }

  try {
    await replaceReportCategories(supabase, reportId, input.categoryIds);
  } catch {
    return { error: t.reportForm.saveError };
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
    return { error: t.reportDetail.deleteError };
  }

  if (!data || data.length === 0) {
    return { error: t.reportDetail.saveRejected };
  }

  revalidatePath("/", "layout");

  return OK;
}

export type WorkCategoryActionState = { error: string | null };

const CATEGORIES_SETTINGS_PATH = "/more/company";

/**
 * Категорії робіт показуються не лише в налаштуваннях компанії: список для вибору при
 * створенні/правці звіту («Налаштування» задають, чим саме він наповнений)
 * і в фільтрах/детальних сторінках, що читають `getWorkCategories`. Тож
 * створення/архівація/відновлення категорії мусить скидати кеш усіх цих
 * шляхів одразу, інакше десь лишиться застаріла категорія (чи не з'явиться
 * нова) до ручного рефрешу.
 */
function revalidateWorkCategoryPaths(): void {
  revalidatePath(CATEGORIES_SETTINGS_PATH);
  revalidatePath("/reports");
  revalidatePath("/reports/new");
  revalidatePath("/reports/[id]", "page");
  revalidatePath("/objects/[id]", "page");
}

/**
 * Створює категорію робіт — тільки boss, розділ «Налаштування» адмінки.
 * RLS (`work_categories_insert`) уже пускає лише `is_boss()` своєї компанії,
 * але роль перевіряємо і тут-таки, до запиту — той самий подвійний бар'єр,
 * що й у `updateCompanyDailyNorm`.
 *
 * Сортування без drag&drop (задача так і просила): нова категорія йде в
 * кінець списку, `sort_order` — максимальний серед активних і архівованих
 * плюс один.
 */
export async function createWorkCategory(
  name: string,
): Promise<WorkCategoryActionState & { id?: string }> {
  const profile = await getProfile();

  if (!profile || profile.role !== "boss") {
    return { error: t.auth.noProfile };
  }

  const label = name.trim();

  if (label === "") {
    return { error: companyStrings.settings.categoriesNameRequired };
  }

  const supabase = await createClient();

  const { data: lastRow, error: lastError } = await supabase
    .from("work_categories")
    .select("sort_order")
    .eq("company_id", profile.company_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastError) {
    return { error: companyStrings.settings.categoriesSaveError };
  }

  const nextSortOrder = (lastRow?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("work_categories")
    .insert({ company_id: profile.company_id, label, sort_order: nextSortOrder })
    .select("id")
    .single();

  if (error) {
    return { error: companyStrings.settings.categoriesSaveError };
  }

  revalidateWorkCategoryPaths();

  return { error: null, id: data.id };
}

/** Архівує категорію — не видалення: старі звіти з нею лишаються без змін. */
export async function archiveWorkCategory(categoryId: string): Promise<WorkCategoryActionState> {
  const profile = await getProfile();

  if (!profile || profile.role !== "boss") {
    return { error: t.auth.noProfile };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("work_categories")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", categoryId)
    .eq("company_id", profile.company_id);

  if (error) {
    return { error: companyStrings.settings.categoriesSaveError };
  }

  revalidateWorkCategoryPaths();

  return OK;
}

/** Повертає архівовану категорію в активний список вибору для нових звітів. */
export async function restoreWorkCategory(categoryId: string): Promise<WorkCategoryActionState> {
  const profile = await getProfile();

  if (!profile || profile.role !== "boss") {
    return { error: t.auth.noProfile };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("work_categories")
    .update({ archived_at: null })
    .eq("id", categoryId)
    .eq("company_id", profile.company_id);

  if (error) {
    return { error: companyStrings.settings.categoriesSaveError };
  }

  revalidateWorkCategoryPaths();

  return OK;
}
