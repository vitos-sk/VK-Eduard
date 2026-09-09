import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "@/lib/supabase/types.gen";
import { compressImage } from "./compress";

export type EntryPhoto = Tables<"entry_photos">;

const BUCKET = "entry-photos";

/** Максимум 6 фото на запись — DATA-MODEL.md. Проверяется на клиенте, не в базе. */
export const MAX_PHOTOS_PER_ENTRY = 6;

/**
 * Сжимает и загружает одно фото: сначала в приватный бакет
 * `{company_id}/{entry_id}/{uuid}.webp`, затем строка метаданных в
 * `entry_photos` — в этом порядке, а не наоборот (ARCHITECTURE.md, раздел
 * «Транзакции»: если вторая часть не пройдёт, в Storage останется мусор,
 * это дешевле распределённой транзакции).
 */
export async function uploadEntryPhoto(
  supabase: SupabaseClient<Database>,
  params: { companyId: string; entryId: string; sortOrder: number },
  file: File,
): Promise<EntryPhoto> {
  const { blob, width, height } = await compressImage(file);
  const path = `${params.companyId}/${params.entryId}/${crypto.randomUUID()}.webp`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: "image/webp" });

  if (uploadError) throw uploadError;

  const { data, error: insertError } = await supabase
    .from("entry_photos")
    .insert({
      entry_id: params.entryId,
      storage_path: path,
      width,
      height,
      size_bytes: blob.size,
      sort_order: params.sortOrder,
    })
    .select("*")
    .single();

  if (insertError) {
    // Метаданные не записались — файл-сирота в Storage подчистит фоновая
    // задача (ARCHITECTURE.md), а не этот запрос: у него нет прав на это
    // решение (может, кто-то другой уже успел прочитать этот путь).
    throw insertError;
  }

  return data;
}

/** Удаляет фото: сначала файл из Storage, потом строку метаданных. */
export async function deleteEntryPhoto(
  supabase: SupabaseClient<Database>,
  photo: Pick<EntryPhoto, "id" | "storage_path">,
): Promise<void> {
  const { error: removeError } = await supabase.storage
    .from(BUCKET)
    .remove([photo.storage_path]);

  if (removeError) throw removeError;

  const { error: deleteError } = await supabase
    .from("entry_photos")
    .delete()
    .eq("id", photo.id);

  if (deleteError) throw deleteError;
}
