import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types.gen";
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
  report_categories: { work_categories: { label: string } | null }[];
};

/** Звіти компанії за діапазон дат — для CSV-експорту «Звіти». */
export async function getCompanyReportsInRange(
  supabase: Client,
  companyId: string,
  fromDate: string,
  toDate: string,
): Promise<SiteReportWithNames[]> {
  const { data, error } = await supabase
    .from("site_reports")
    .select(
      "*, profiles(full_name), sites(name), report_photos(id), report_categories(work_categories(label))",
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
        .map((item) => item.work_categories?.label ?? "")
        .filter((label) => label !== ""),
      photo_count: report_photos.length,
    }),
  );
}
