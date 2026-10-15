"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { getT } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";
import { getProfile } from "@/modules/auth/session";

import { isSitePhotoPath, SITE_PHOTOS_BUCKET, sitePhotoPath } from "./photoPath";
import { getSiteById, type Site } from "./queries";

/**
 * Фото объекта может добавить и сменить любой сотрудник фирмы, а не только шеф и автор объекта.
 * Обычные права (`sites_update`, загрузка в хранилище) этого не разрешают, поэтому здесь два шага с сервера:
 *  1. `createSitePhotoUpload`: выдаёт телефону одноразовую ссылку на загрузку в папку этого объекта;
 *  2. `setSitePhoto`: записывает путь загруженного файла в `sites.photo_path` и убирает прежнее фото.
 * Доступ сначала проверяет RLS: объект виден только своей фирме. Меняется ровно одна колонка одного объекта.
 */

export type SitePhotoUploadState =
  | { error: string; path: null; token: null }
  | { error: null; path: string; token: string };

export type SitePhotoState = { error: string | null };

/** Объект, видимый человеку (RLS пускает только свою фирму), или `null`. */
async function visibleSite(siteId: string): Promise<Site | null> {
  if (!isUuid(siteId)) return null;

  try {
    return await getSiteById(await createClient(), siteId);
  } catch {
    return null;
  }
}

/** Шаг 1: ссылка, по которой телефон сам загрузит сжатое фото в папку объекта. */
export async function createSitePhotoUpload(siteId: string): Promise<SitePhotoUploadState> {
  const t = await getT();
  const failed: SitePhotoUploadState = { error: t.objects.form.uploadPhotoError, path: null, token: null };

  const profile = await getProfile();
  if (!profile) return { error: t.auth.noProfile, path: null, token: null };

  const site = await visibleSite(siteId);
  if (!site) return failed;

  const path = sitePhotoPath(site.company_id, site.id, randomUUID());
  const { data, error } = await createAdminClient().storage.from(SITE_PHOTOS_BUCKET).createSignedUploadUrl(path);

  return error || !data ? failed : { error: null, path, token: data.token };
}

/** Шаг 2: фото загружено, делаем его обложкой объекта; прежнее фото удаляется из хранилища. */
export async function setSitePhoto(siteId: string, path: string): Promise<SitePhotoState> {
  const t = await getT();
  const failed = { error: t.objects.form.uploadPhotoError };

  const profile = await getProfile();
  if (!profile) return { error: t.auth.noProfile };

  const site = await visibleSite(siteId);
  if (!site || !isSitePhotoPath(path, site.company_id, site.id)) return failed;

  const admin = createAdminClient();

  // Файл должен действительно лежать в хранилище (загрузка могла оборваться), иначе у объекта было бы «битое» фото.
  const { error: missing } = await admin.storage.from(SITE_PHOTOS_BUCKET).createSignedUrl(path, 60);
  if (missing) return failed;

  const { error: updateError } = await admin.from("sites").update({ photo_path: path }).eq("id", site.id);
  if (updateError) return failed;

  if (site.photo_path && site.photo_path !== path) {
    try {
      await admin.storage.from(SITE_PHOTOS_BUCKET).remove([site.photo_path]);
    } catch {
      /* не критично: лишний файл не мешает, новое фото уже установлено */
    }
  }

  revalidatePath("/objects");
  revalidatePath(`/objects/${site.id}`);
  revalidatePath("/");

  return { error: null };
}
