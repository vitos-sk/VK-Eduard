import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "@/lib/supabase/types.gen";
import { compressImage } from "./compress";

export type EntryPhoto = Tables<"entry_photos">;

const BUCKET = "entry-photos";
const SITE_PHOTOS_BUCKET = "site-photos";

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

/**
 * Загружает обложку объекта: сжимает, кладёт в приватный бакет
 * `{company_id}/{site_id}/{uuid}.webp`, затем пишет путь в `sites.photo_path`.
 * Старый файл (если был) не трогает — его подчищает вызывающая сторона
 * через `deleteSitePhoto`, чтобы не потерять фото при неудачном апдейте.
 */
export async function uploadSitePhoto(
  supabase: SupabaseClient<Database>,
  params: { companyId: string; siteId: string },
  file: File,
): Promise<string> {
  const { blob } = await compressImage(file);
  const path = `${params.companyId}/${params.siteId}/${crypto.randomUUID()}.webp`;

  const { error: uploadError } = await supabase.storage
    .from(SITE_PHOTOS_BUCKET)
    .upload(path, blob, { contentType: "image/webp" });

  if (uploadError) throw uploadError;

  const { error: updateError } = await supabase
    .from("sites")
    .update({ photo_path: path })
    .eq("id", params.siteId);

  if (updateError) throw updateError;

  return path;
}

/** Удаляет обложку объекта: файл из Storage, затем `photo_path` в null. */
export async function deleteSitePhoto(
  supabase: SupabaseClient<Database>,
  siteId: string,
  photoPath: string,
): Promise<void> {
  const { error: removeError } = await supabase.storage
    .from(SITE_PHOTOS_BUCKET)
    .remove([photoPath]);

  if (removeError) throw removeError;

  const { error: updateError } = await supabase
    .from("sites")
    .update({ photo_path: null })
    .eq("id", siteId);

  if (updateError) throw updateError;
}
