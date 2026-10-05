"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/modules/auth/session";
import {
  isBreakPairValid,
  isDurationValid,
  minutesBetweenWrapped,
} from "@/modules/time/calc";

export type EntryActionState = { error: string | null };

const OK: EntryActionState = { error: null };

export interface ManualEntryInput {
  workDate: string;
  siteId: string | null;
  startedAt: string;
  endedAt: string;
  breakStart: string | null;
  breakEnd: string | null;
  description: string;
  /**
   * Ключ идемпотентности записи. Задаёт клиент (он же кладёт запись в офлайн-очередь),
   * поэтому повторная отправка той же записи не создаёт дубль.
   */
  clientId?: string;
}

export interface CreateManualEntryState extends EntryActionState {
  /** `id` новой записи — форме «Звіти» он нужен, чтобы сразу прикрепить фото. */
  entryId: string | null;
}

/**
 * Ручной ввод смены — всегда уже закрытой (форма требует и начало, и конец).
 * Время здесь вводит сам пользователь в форме — оно однозначно локальное,
 * в отличие от таймера, поэтому дополнительно передавать часовой пояс не нужно.
 *
 * Проверки дублируют ограничения базы (`duration_sane`, `break_pair`):
 * так форма отказывает понятным текстом раньше, чем письмо от Postgres.
 */
export async function createManualEntry(
  input: ManualEntryInput,
): Promise<CreateManualEntryState> {
  const t = await getT();
  const profile = await getProfile();

  if (!profile) {
    return { error: t.auth.noProfile, entryId: null };
  }

  if (!isBreakPairValid(input.breakStart, input.breakEnd)) {
    return { error: t.hours.genericError, entryId: null };
  }

  const worked =
    minutesBetweenWrapped(input.startedAt, input.endedAt) -
    (input.breakStart && input.breakEnd
      ? minutesBetweenWrapped(input.breakStart, input.breakEnd)
      : 0);

  if (!isDurationValid(worked)) {
    return { error: t.manualTime.errorDuration, entryId: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_entries")
    .insert({
      client_id: input.clientId ?? randomUUID(),
      company_id: profile.company_id,
      author_id: profile.id,
      site_id: input.siteId,
      work_date: input.workDate,
      started_at: input.startedAt,
      ended_at: input.endedAt,
      break_start: input.breakStart,
      break_end: input.breakEnd,
      description: input.description,
      source: "manual",
    })
    .select("id")
    .single();

  if (error) {
    // Запись с этим client_id уже есть: предыдущая отправка дошла, а ответ потерялся.
    if (error.code === "23505" && input.clientId) {
      const { data: existing } = await supabase
        .from("work_entries")
        .select("id")
        .eq("client_id", input.clientId)
        .maybeSingle();

      if (existing) return { error: null, entryId: existing.id };
    }

    // `ended_at` тут всегда задан, поэтому индекс «одна открытая смена»
    // не участвует — реальная причина отказа почти наверняка не в нём.
    return { error: t.manualTime.saveError, entryId: null };
  }

  revalidatePath("/", "layout");

  return { error: null, entryId: data.id };
}

/**
 * Полная правка записи — объект, дата, время, опис. Перерву навмисно не
 * чіпаємо: форма редагування не дає її міняти, тож передаємо ті самі
 * `breakStart`/`breakEnd`, що вже лежали в записі, інакше є ризик тихо
 * затерти реальний перерву значенням за замовчуванням.
 * Та сама розвилка `saveRejected`, що й у `updateEntryDescription`.
 */
export async function updateEntry(
  entryId: string,
  input: ManualEntryInput,
): Promise<EntryActionState> {
  const t = await getT();
  const profile = await getProfile();

  if (!profile) {
    return { error: t.auth.noProfile };
  }

  if (!isBreakPairValid(input.breakStart, input.breakEnd)) {
    return { error: t.hours.genericError };
  }

  const worked =
    minutesBetweenWrapped(input.startedAt, input.endedAt) -
    (input.breakStart && input.breakEnd
      ? minutesBetweenWrapped(input.breakStart, input.breakEnd)
      : 0);

  if (!isDurationValid(worked)) {
    return { error: t.manualTime.errorDuration };
  }

  // Форма редагування (ManualTimeScreen) вимагає об'єкт або опис — та сама
  // умова тут, а не тільки на клієнті, бо `updateEntry` не має іншого
  // виклику, якому ця вимога заважала б.
  if (input.siteId === null && input.description.trim() === "") {
    return { error: t.manualTime.errorSiteOrDescription };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_entries")
    .update({
      site_id: input.siteId,
      work_date: input.workDate,
      started_at: input.startedAt,
      ended_at: input.endedAt,
      break_start: input.breakStart,
      break_end: input.breakEnd,
      description: input.description,
    })
    .eq("id", entryId)
    .select("id");

  if (error) {
    return { error: t.manualTime.saveError };
  }

  if (!data || data.length === 0) {
    return { error: t.reportDetail.saveRejected };
  }

  revalidatePath("/", "layout");

  return OK;
}

/**
 * Видаляє запис. Фото видаляються каскадом на рівні бази (`on delete
 * cascade`), файли в Storage залишаються — за ними прибирає фонова задача
 * (ARCHITECTURE.md), а не цей запит, як і при видаленні одного фото
 * (`modules/media/photos.deleteEntryPhoto`).
 *
 * `entries_delete` (міграції 0005, 0007) — та сама розвилка прав, що й у
 * `entries_update`: своя запис рабочому, будь-яка шефу.
 */
export async function deleteEntry(entryId: string): Promise<EntryActionState> {
  const t = await getT();
  const profile = await getProfile();

  if (!profile) {
    return { error: t.auth.noProfile };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_entries")
    .delete()
    .eq("id", entryId)
    .select("id");

  if (error) {
    return { error: t.hours.deleteError };
  }

  if (!data || data.length === 0) {
    return { error: t.reportDetail.saveRejected };
  }

  revalidatePath("/", "layout");

  return OK;
}
