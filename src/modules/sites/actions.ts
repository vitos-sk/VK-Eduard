"use server";

import { revalidatePath } from "next/cache";

import { t } from "@/lib/i18n";
import type { WorkStatus } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/modules/auth/session";

export type SiteActionState = { error: string | null };

const OK: SiteActionState = { error: null };

/** Код Postgres при отказе RLS — рядовой работник не может писать в `sites`. */
const RLS_VIOLATION = "42501";

export interface SiteInput {
  name: string;
  kind: string;
  address: string;
  status: WorkStatus;
}

/**
 * Создаёт объект. RLS (`sites_insert`) пускает только `is_boss()` — попытка
 * рядового работника вернёт `42501`, здесь это превращается в понятный текст,
 * а не остаётся кодом ограничения.
 */
export async function createSite(
  input: SiteInput,
): Promise<SiteActionState & { id?: string }> {
  const profile = await getProfile();

  if (!profile) {
    return { error: t.auth.noProfile };
  }

  if (input.name.trim() === "") {
    return { error: t.objects.form.nameRequired };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sites")
    .insert({
      company_id: profile.company_id,
      name: input.name.trim(),
      kind: input.kind.trim() || null,
      address: input.address.trim() || null,
      status: input.status,
    })
    .select("id")
    .single();

  if (error) {
    return {
      error: error.code === RLS_VIOLATION ? t.auth.noProfile : t.objects.form.saveError,
    };
  }

  revalidatePath("/objects");

  return { ...OK, id: data.id };
}

/** Правит поля объекта. Та же RLS-развилка, что и у создания. */
export async function updateSite(
  siteId: string,
  input: SiteInput,
): Promise<SiteActionState> {
  const profile = await getProfile();

  if (!profile) {
    return { error: t.auth.noProfile };
  }

  if (input.name.trim() === "") {
    return { error: t.objects.form.nameRequired };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("sites")
    .update({
      name: input.name.trim(),
      kind: input.kind.trim() || null,
      address: input.address.trim() || null,
      status: input.status,
    })
    .eq("id", siteId);

  if (error) {
    return {
      error: error.code === RLS_VIOLATION ? t.auth.noProfile : t.objects.form.saveError,
    };
  }

  revalidatePath("/objects");
  revalidatePath(`/objects/${siteId}`);

  return OK;
}

/**
 * Архивирует/розархивовує об'єкт — `archived_at` timestamptz, а не
 * видалення: історія записів по об'єкту не повинна зникати
 * (`getAllSites` навмисно не фільтрує архівні).
 */
export async function setSiteArchived(
  siteId: string,
  archived: boolean,
): Promise<SiteActionState> {
  const profile = await getProfile();

  if (!profile) {
    return { error: t.auth.noProfile };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("sites")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", siteId);

  if (error) {
    return {
      error: error.code === RLS_VIOLATION ? t.auth.noProfile : t.objects.form.saveError,
    };
  }

  revalidatePath("/objects");
  revalidatePath(`/objects/${siteId}`);

  return OK;
}
