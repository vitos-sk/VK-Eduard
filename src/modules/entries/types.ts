import type { Tables } from "@/lib/supabase/types.gen";

/** Строка `work_entries` как она лежит в базе — включая generated-колонки. */
export type WorkEntry = Tables<"work_entries">;

/** Фото записи. */
export type EntryPhoto = Tables<"entry_photos">;

/** Запись вместе с её фото — то, что рисует лента «Звіти» и деталка. */
export interface WorkEntryWithPhotos extends WorkEntry {
  entry_photos: EntryPhoto[];
}
