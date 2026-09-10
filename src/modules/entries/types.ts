import type { Tables } from "@/lib/supabase/types.gen";

/** Строка `work_entries` как она лежит в базе — включая generated-колонки. */
export type WorkEntry = Tables<"work_entries">;

/** Фото записи. */
export type EntryPhoto = Tables<"entry_photos">;

/** Запись вместе с её фото — то, что рисует лента «Звіти» и деталка. */
export interface WorkEntryWithPhotos extends WorkEntry {
  entry_photos: EntryPhoto[];
}

/**
 * Запись для детальной страницы `/reports/[id]` — с фото и данными автора.
 * Автор нужен отдельно от зрителя: шеф открывает записи всей команды
 * (RLS это уже разрешает), и подпись/норма должны быть его, а не шефа.
 */
export interface WorkEntryDetail extends WorkEntryWithPhotos {
  author_full_name: string;
  author_daily_norm_minutes: number;
}

/**
 * Смена вместе с именем автора и объекта — таблица «Зміни за місяць» внизу
 * экрана «Години». RLS сама решает, чьи строки попадут в выборку: рабочему —
 * только свои, шефу — все по компании, поэтому автора нужно подписывать.
 */
export interface WorkEntryWithNames extends WorkEntry {
  author_full_name: string;
  site_name: string | null;
}
