import type { Tables } from "@/lib/supabase/types.gen";

export type SiteReport = Tables<"site_reports">;
export type ReportPhoto = Tables<"report_photos">;
export type WorkCategory = Tables<"work_categories">;

/** Звіт разом з фото і id обраних категорій — те, що малює стрічка і форма. */
export interface SiteReportWithPhotos extends SiteReport {
  report_photos: ReportPhoto[];
  category_ids: string[];
}

/** Звіт для детальної сторінки `/reports/[id]` — з ім'ям автора. */
export interface SiteReportDetail extends SiteReportWithPhotos {
  author_full_name: string;
}

/** Звіт для експорту/команди — з іменами автора, об'єкта і назвами категорій. */
export interface SiteReportWithNames extends SiteReport {
  author_full_name: string;
  site_name: string | null;
  category_labels: string[];
  photo_count: number;
}
