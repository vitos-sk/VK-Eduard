import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "@/lib/supabase/types.gen";
import type { Dict } from "@/lib/i18n";
import { categoryLabel } from "./categoryLabels";
import type {
  ReportPhoto,
  SiteReport,
  SiteReportDetail,
  SiteReportWithNames,
  SiteReportWithPhotos,
  WorkCategory,
} from "./types";

type Client = SupabaseClient<Database>;

type ReportRow = SiteReport & {
  report_photos: ReportPhoto[];
  report_categories: { category_id: string }[];
};

function withCategoryIds(row: ReportRow): SiteReportWithPhotos {
  const { report_categories, ...rest } = row;
  return { ...rest, category_ids: report_categories.map((item) => item.category_id) };
}

/** Категорії компанії, активні (не архівовані), у порядку `sort_order`. */
export async function getWorkCategories(
  supabase: Client,
  companyId: string,
): Promise<WorkCategory[]> {
  const { data, error } = await supabase
    .from("work_categories")
    .select("*")
    .eq("company_id", companyId)
    .is("archived_at", null)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return data ?? [];
}

/**
 * Усі категорії компанії — активні й архівовані, для розділу «Налаштування»
 * сторінки `/more/company`, де boss бачить і керує повним списком.
 * Активні спершу (`archived_at` null раніше в сортуванні), далі за
 * `sort_order` — так само, як `getWorkCategories`, для передбачуваного
 * порядку в UI.
 */
export async function getAllWorkCategoriesForAdmin(
  supabase: Client,
  companyId: string,
): Promise<WorkCategory[]> {
  const { data, error } = await supabase
    .from("work_categories")
    .select("*")
    .eq("company_id", companyId)
    .order("archived_at", { ascending: true, nullsFirst: true })
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return data ?? [];
}

/** Лента звітів автора з фото і категоріями, від нових до старих. */
export async function getReportsFeed(
  supabase: Client,
  authorId: string,
): Promise<SiteReportWithPhotos[]> {
  const { data, error } = await supabase
    .from("site_reports")
    .select("*, report_photos(*), report_categories(category_id)")
    .eq("author_id", authorId)
    .order("work_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as ReportRow[]).map(withCategoryIds);
}

/**
 * Усі звіти компанії з фото — для лічильників у картках об'єктів. Об'єкт
 * спільний, тож рахувати треба по звітах усіх авторів; RLS сама віддає шефу
 * все по компанії, працівнику — тільки його звіти.
 */
export async function getCompanyReportsWithPhotos(
  supabase: Client,
  companyId: string,
): Promise<SiteReportWithPhotos[]> {
  const { data, error } = await supabase
    .from("site_reports")
    .select("*, report_photos(*), report_categories(category_id)")
    .eq("company_id", companyId)
    .not("site_id", "is", null);

  if (error) throw error;

  return ((data ?? []) as ReportRow[]).map(withCategoryIds);
}

/** Усі звіти по об'єкту (всі автори) — для шефа на сторінці об'єкта. RLS сама обмежує компанією. */
export async function getSiteReportsFeed(
  supabase: Client,
  siteId: string,
): Promise<SiteReportWithPhotos[]> {
  const { data, error } = await supabase
    .from("site_reports")
    .select("*, report_photos(*), report_categories(category_id)")
    .eq("site_id", siteId)
    .order("work_date", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as ReportRow[]).map(withCategoryIds);
}

/** Один звіт з фото, категоріями і ім'ям автора — для `/reports/[id]`. */
export async function getReportWithPhotos(
  supabase: Client,
  reportId: string,
): Promise<SiteReportDetail | null> {
  const { data, error } = await supabase
    .from("site_reports")
    .select("*, report_photos(*), report_categories(category_id), profiles(full_name)")
    .eq("id", reportId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { profiles, ...row } = data as ReportRow & {
    profiles: { full_name: string } | null;
  };

  return { ...withCategoryIds(row), author_full_name: profiles?.full_name ?? "" };
}

type CompanyReportRow = SiteReport & {
  profiles: { full_name: string } | null;
  sites: { name: string } | null;
  report_photos: { id: string }[];
  report_categories: { work_categories: { label: string; is_other: boolean } | null }[];
};

/** Звіти компанії за діапазон дат — для CSV-експорту «Звіти». */
export async function getCompanyReportsInRange(
  supabase: Client,
  companyId: string,
  fromDate: string,
  toDate: string,
  t: Dict,
): Promise<SiteReportWithNames[]> {
  const { data, error } = await supabase
    .from("site_reports")
    .select(
      "*, profiles(full_name), sites(name), report_photos(id), report_categories(work_categories(label, is_other))",
    )
    .eq("company_id", companyId)
    .gte("work_date", fromDate)
    .lte("work_date", toDate)
    .order("work_date", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as CompanyReportRow[]).map(
    ({ profiles, sites, report_photos, report_categories, ...report }) => ({
      ...report,
      author_full_name: profiles?.full_name ?? "",
      site_name: sites?.name ?? null,
      category_labels: report_categories
        .map((item) => (item.work_categories ? categoryLabel(item.work_categories, report.other_text, t) : ""))
        .filter((label) => label !== ""),
      photo_count: report_photos.length,
    }),
  );
}

/**
 * Время, отработанное по отчёту: смены того же автора за ту же дату на том же объекте.
 * Отчёт и смена связаны только этим совпадением (отдельной ссылки между ними нет): так время,
 * внесённое в форме отчёта или на экране «Додати час», показывается на странице отчёта одинаково.
 */
export async function getReportEntries(
  supabase: Client,
  report: Pick<SiteReport, "author_id" | "work_date" | "site_id">,
): Promise<Tables<"work_entries">[]> {
  let query = supabase
    .from("work_entries")
    .select("*")
    .eq("author_id", report.author_id)
    .eq("work_date", report.work_date)
    .not("ended_at", "is", null)
    .order("started_at", { ascending: true });

  query = report.site_id ? query.eq("site_id", report.site_id) : query.is("site_id", null);

  const { data, error } = await query;

  if (error) throw error;

  return data ?? [];
}
