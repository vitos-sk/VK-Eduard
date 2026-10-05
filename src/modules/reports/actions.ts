"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/modules/auth/session";
import { OTHER_TEXT_MAX_LENGTH } from "@/modules/reports/categoryLabels";
import {
  isBreakPairValid,
  isDurationValid,
  minutesBetweenWrapped,
} from "@/modules/time/calc";

export type ReportActionState = { error: string | null };

const OK: ReportActionState = { error: null };

/** Відпрацьований час, внесений прямо у формі звіту — стає записом табеля. */
export interface ReportTimeInput {
  startedAt: string;
  endedAt: string;
  breakStart: string | null;
  breakEnd: string | null;
}

export interface ReportInput {
  workDate: string;
  siteId: string | null;
  description: string;
  categoryIds: string[];
  /** Текст категорії «Інше»; ігнорується, якщо «Інше» не вибрано. */
  otherText: string;
}

export interface CreateReportInput extends ReportInput {
  /** Что забрало время (проблемное место) — необязательно. */
  problemNote?: string;
  /** Не задано — звіт без годин, як і раніше. */
  time?: ReportTimeInput | null;
}

export interface CreateReportState extends ReportActionState {
  reportId: string | null;
}

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Текст «Інше», який треба зберегти: обрізаний, а якщо «Інше» серед
 * категорій нема — порожній (щоб не лишався «хвіст» від знятої категорії).
 * `null` — «Інше» вибрано, а тексту нема: звіт не зберігаємо.
 */
async function resolveOtherText(
  supabase: ServerClient,
  categoryIds: readonly string[],
  otherText: string,
): Promise<string | null> {
  if (categoryIds.length === 0) return "";

  const { data, error } = await supabase
    .from("work_categories")
    .select("id")
    .in("id", [...categoryIds])
    .eq("is_other", true);

  if (error) throw error;
  if (!data || data.length === 0) return "";

  const text = otherText.trim().slice(0, OTHER_TEXT_MAX_LENGTH);

  return text === "" ? null : text;
}

/**
 * Перезаписує повний набір категорій звіту: видаляє старі зв'язки і вставляє
 * нові одним запитом — простіше й дешевше за diff, а звітів мало категорій
 * (одиниці), тому зайвої роботи тут не буде.
 */
async function replaceReportCategories(
  supabase: ServerClient,
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

/**
 * Створює звіт. Якщо передано `time`, паралельно пишеться закритий запис
 * табеля (`work_entries`, source `manual`) з тим самим об'єктом, датою й
 * описом — години й звіт вводяться одним кроком, а не двома окремими екранами.
 *
 * Годину перевіряємо до будь-якого запису; якщо щось падає вже після
 * вставки звіту, звіт прибираємо, щоб повторне «Зберегти» не наплодило дублів.
 */
export async function createReport(input: CreateReportInput): Promise<CreateReportState> {
  const t = await getT();
  const profile = await getProfile();

  if (!profile) {
    return { error: t.auth.noProfile, reportId: null };
  }

  const time = input.time ?? null;

  if (time) {
    const worked =
      minutesBetweenWrapped(time.startedAt, time.endedAt) -
      (time.breakStart && time.breakEnd
        ? minutesBetweenWrapped(time.breakStart, time.breakEnd)
        : 0);

    if (!isBreakPairValid(time.breakStart, time.breakEnd) || !isDurationValid(worked)) {
      return { error: t.manualTime.errorDuration, reportId: null };
    }
  }

  const supabase = await createClient();

  let otherText: string | null;

  try {
    otherText = await resolveOtherText(supabase, input.categoryIds, input.otherText);
  } catch {
    return { error: t.reportForm.saveError, reportId: null };
  }

  if (otherText === null) {
    return { error: t.reportForm.otherRequired, reportId: null };
  }

  const problemNote = input.problemNote?.trim() ?? "";
  const baseRow = {
    client_id: randomUUID(),
    company_id: profile.company_id,
    author_id: profile.id,
    site_id: input.siteId,
    work_date: input.workDate,
    description: input.description,
    other_text: otherText,
  };

  // Колонку `problem_note` добавляет миграция 0017. Пустую заметку не отправляем вовсе, а если база
  // ещё без миграции и заметка есть — сохраняем отчёт без неё: потерять заметку лучше, чем не дать
  // сохранить отчёт совсем.
  let { data, error } = await supabase
    .from("site_reports")
    .insert({ ...baseRow, ...(problemNote ? { problem_note: problemNote } : {}) })
    .select("id")
    .single();

  if (error && problemNote && /problem_note/i.test(`${error.message} ${error.details ?? ""}`)) {
    ({ data, error } = await supabase.from("site_reports").insert(baseRow).select("id").single());
  }

  if (error || !data) {
    return { error: t.reportForm.saveError, reportId: null };
  }

  try {
    await replaceReportCategories(supabase, data.id, input.categoryIds);

    if (time) {
      const { error: entryError } = await supabase.from("work_entries").insert({
        client_id: randomUUID(),
        company_id: profile.company_id,
        author_id: profile.id,
        site_id: input.siteId,
        work_date: input.workDate,
        started_at: time.startedAt,
        ended_at: time.endedAt,
        break_start: time.breakStart,
        break_end: time.breakEnd,
        description: input.description,
        source: "manual",
      });

      if (entryError) throw entryError;
    }
  } catch {
    await supabase.from("site_reports").delete().eq("id", data.id);

    return { error: t.reportForm.saveError, reportId: null };
  }

  revalidatePath("/", "layout");

  return { error: null, reportId: data.id };
}

/** Повна правка звіту — об'єкт, дата, опис, категорії. */
export async function updateReport(
  reportId: string,
  input: ReportInput,
): Promise<ReportActionState> {
  const t = await getT();
  const profile = await getProfile();

  if (!profile) {
    return { error: t.auth.noProfile };
  }

  const supabase = await createClient();

  let otherText: string | null;

  try {
    otherText = await resolveOtherText(supabase, input.categoryIds, input.otherText);
  } catch {
    return { error: t.reportForm.saveError };
  }

  if (otherText === null) {
    return { error: t.reportForm.otherRequired };
  }

  const { data, error } = await supabase
    .from("site_reports")
    .update({
      site_id: input.siteId,
      work_date: input.workDate,
      description: input.description,
      other_text: otherText,
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
  const t = await getT();
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

/** Правка блока «Проблемное место» — что забрало время. Пустая строка очищает блок. */
export async function updateReportProblem(
  reportId: string,
  problemNote: string,
): Promise<ReportActionState> {
  const t = await getT();
  const profile = await getProfile();

  if (!profile) {
    return { error: t.auth.noProfile };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_reports")
    .update({ problem_note: problemNote.trim() })
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
  otherText: string,
): Promise<ReportActionState> {
  const t = await getT();
  const profile = await getProfile();

  if (!profile) {
    return { error: t.auth.noProfile };
  }

  const supabase = await createClient();

  try {
    const resolvedText = await resolveOtherText(supabase, categoryIds, otherText);

    if (resolvedText === null) {
      return { error: t.reportForm.otherRequired };
    }

    const { data, error } = await supabase
      .from("site_reports")
      .update({ other_text: resolvedText })
      .eq("id", reportId)
      .select("id");

    if (error) throw error;
    if (!data || data.length === 0) return { error: t.reportDetail.saveRejected };

    await replaceReportCategories(supabase, reportId, categoryIds);
  } catch {
    return { error: t.reportDetail.saveError };
  }

  revalidatePath("/", "layout");

  return OK;
}

/** Видаляє звіт. Фото видаляються каскадом на рівні бази. */
export async function deleteReport(reportId: string): Promise<ReportActionState> {
  const t = await getT();
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
  const t = await getT();
  const profile = await getProfile();

  if (!profile || profile.role !== "boss") {
    return { error: t.auth.noProfile };
  }

  const label = name.trim();

  if (label === "") {
    return { error: t.companyUi.settings.categoriesNameRequired };
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
    return { error: t.companyUi.settings.categoriesSaveError };
  }

  const nextSortOrder = (lastRow?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("work_categories")
    .insert({ company_id: profile.company_id, label, sort_order: nextSortOrder })
    .select("id")
    .single();

  if (error) {
    return { error: t.companyUi.settings.categoriesSaveError };
  }

  revalidateWorkCategoryPaths();

  return { error: null, id: data.id };
}

/** Архівує категорію — не видалення: старі звіти з нею лишаються без змін. */
export async function archiveWorkCategory(categoryId: string): Promise<WorkCategoryActionState> {
  const t = await getT();
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
    return { error: t.companyUi.settings.categoriesSaveError };
  }

  revalidateWorkCategoryPaths();

  return OK;
}

/** Повертає архівовану категорію в активний список вибору для нових звітів. */
export async function restoreWorkCategory(categoryId: string): Promise<WorkCategoryActionState> {
  const t = await getT();
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
    return { error: t.companyUi.settings.categoriesSaveError };
  }

  revalidateWorkCategoryPaths();

  return OK;
}
