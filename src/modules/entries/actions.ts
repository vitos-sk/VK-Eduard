"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/modules/auth/session";
import {
  isBreakPairValid,
  isDurationValid,
  minutesBetweenWrapped,
} from "@/modules/time/calc";

export type EntryActionState = { error: string | null };

const OK: EntryActionState = { error: null };

/**
 * Уникальный код Postgres, если вставка нарушила `one_open_entry_per_user`:
 * PostgREST пробрасывает `SQLSTATE` как есть.
 */
const UNIQUE_VIOLATION = "23505";

/**
 * Начинает смену: запись с `ended_at = null`. Открытая смена у автора
 * может быть только одна — при повторной попытке база отклонит вставку
 * уникальным индексом, здесь это превращается в понятный текст.
 *
 * `date`/`time` приходят от вызывающего клиента, а не считаются здесь:
 * сервер (Vercel) исполняется в UTC и не знает часовой пояс рабочего.
 * Взять «сейчас» на сервере значило бы записать смену со сдвигом на пояс
 * дата-центра — `modules/time.hhmmOf`/`dateKeyOf` считают его в браузере.
 */
export async function startShift(
  siteId: string | null,
  date: string,
  time: string,
): Promise<EntryActionState> {
  const profile = await getProfile();

  if (!profile) {
    return { error: t.auth.noProfile };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("work_entries").insert({
    client_id: randomUUID(),
    company_id: profile.company_id,
    author_id: profile.id,
    site_id: siteId,
    work_date: date,
    started_at: time,
    source: "timer",
  });

  if (error) {
    return {
      error:
        error.code === UNIQUE_VIOLATION
          ? t.hours.alreadyRunning
          : t.hours.genericError,
    };
  }

  revalidatePath("/", "layout");

  return OK;
}

/** Завершает текущую открытую смену автора. `time` — локальное время клиента. */
export async function stopCurrentShift(time: string): Promise<EntryActionState> {
  const profile = await getProfile();

  if (!profile) {
    return { error: t.auth.noProfile };
  }

  const supabase = await createClient();
  const { data: open, error: findError } = await supabase
    .from("work_entries")
    .select("id, break_start, break_end")
    .eq("author_id", profile.id)
    .is("ended_at", null)
    .maybeSingle();

  if (findError) {
    return { error: t.hours.genericError };
  }

  if (!open) {
    return { error: t.hours.noOpenShift };
  }

  // Забыли натиснути «Завершити перерву» — закриваємо її тим самим моментом,
  // що й зміну. Інакше хвіст перерви залишиться незакритим і порахується
  // як відпрацьований час, а не як перерва.
  const stillOnBreak = open.break_start !== null && open.break_end === null;

  const { error } = await supabase
    .from("work_entries")
    .update(
      stillOnBreak ? { ended_at: time, break_end: time } : { ended_at: time },
    )
    .eq("id", open.id);

  if (error) {
    // duration_sane: смена длиннее 18 годин — типичная причина, если
    // «Почати роботу» нажали и забыли про неё на несколько дней.
    return { error: t.hours.genericError };
  }

  revalidatePath("/", "layout");

  return OK;
}

/**
 * Начинает перерыв в текущей открытой смене. Перерыв в записи один —
 * если он уже был, база отклонит по `break_pair`, но мы проверяем
 * заранее, чтобы дать понятный текст, а не код ограничения.
 */
export async function startCurrentBreak(time: string): Promise<EntryActionState> {
  const profile = await getProfile();

  if (!profile) {
    return { error: t.auth.noProfile };
  }

  const supabase = await createClient();
  const { data: open, error: findError } = await supabase
    .from("work_entries")
    .select("id, break_start")
    .eq("author_id", profile.id)
    .is("ended_at", null)
    .maybeSingle();

  if (findError) {
    return { error: t.hours.genericError };
  }

  if (!open) {
    return { error: t.hours.noOpenShift };
  }

  if (open.break_start !== null) {
    return { error: t.hours.breakAlreadyTaken };
  }

  const { error } = await supabase
    .from("work_entries")
    .update({ break_start: time })
    .eq("id", open.id);

  if (error) {
    return { error: t.hours.genericError };
  }

  revalidatePath("/", "layout");

  return OK;
}

/** Завершает перерыв, начатый `startCurrentBreak`. */
export async function endCurrentBreak(time: string): Promise<EntryActionState> {
  const profile = await getProfile();

  if (!profile) {
    return { error: t.auth.noProfile };
  }

  const supabase = await createClient();
  const { data: open, error: findError } = await supabase
    .from("work_entries")
    .select("id, break_start, break_end")
    .eq("author_id", profile.id)
    .is("ended_at", null)
    .maybeSingle();

  if (findError) {
    return { error: t.hours.genericError };
  }

  if (!open) {
    return { error: t.hours.noOpenShift };
  }

  if (open.break_start === null) {
    return { error: t.hours.breakNotStarted };
  }

  if (open.break_end !== null) {
    return { error: t.hours.breakAlreadyEnded };
  }

  const { error } = await supabase
    .from("work_entries")
    .update({ break_end: time })
    .eq("id", open.id);

  if (error) {
    return { error: t.hours.genericError };
  }

  revalidatePath("/", "layout");

  return OK;
}

export interface ManualEntryInput {
  workDate: string;
  siteId: string | null;
  startedAt: string;
  endedAt: string;
  breakStart: string | null;
  breakEnd: string | null;
  description: string;
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
      client_id: randomUUID(),
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
    // `ended_at` тут всегда задан, поэтому индекс «одна открытая смена»
    // не участвует — реальная причина отказа почти наверняка не в нём.
    return { error: t.manualTime.saveError, entryId: null };
  }

  revalidatePath("/", "layout");

  return { error: null, entryId: data.id };
}

/**
 * Дозаполнение описания — «Дописати» на карточці «Без опису» и правка
 * в детальной странице. RLS сам решает, можно ли: своя запись за последние
 * 7 дней или что угодно, если шеф.
 */
export async function updateEntryDescription(
  entryId: string,
  description: string,
): Promise<EntryActionState> {
  const profile = await getProfile();

  if (!profile) {
    return { error: t.auth.noProfile };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_entries")
    .update({ description })
    .eq("id", entryId)
    .select("id");

  if (error) {
    return { error: t.reportDetail.saveError };
  }

  // UPDATE, которому RLS не даёт совпасть ни с одной строкой, не ошибка,
  // а пустой результат — окно правки закрылось, а не «что-то пошло не так».
  if (!data || data.length === 0) {
    return { error: t.reportDetail.editWindowClosed };
  }

  revalidatePath("/", "layout");

  return OK;
}

/**
 * Полная правка записи — объект, дата, время, опис. Перерву навмисно не
 * чіпаємо: форма редагування не дає її міняти, тож передаємо ті самі
 * `breakStart`/`breakEnd`, що вже лежали в записі, інакше є ризик тихо
 * затерти реальний перерву значенням за замовчуванням.
 * Та сама розвилка `editWindowClosed`, що й у `updateEntryDescription`.
 */
export async function updateEntry(
  entryId: string,
  input: ManualEntryInput,
): Promise<EntryActionState> {
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
    return { error: t.reportDetail.editWindowClosed };
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
 * `entries_delete` (міграція 0005) — та сама розвилка прав, що й у
 * `entries_update`: своя запис за 7 днів рабочому, будь-яка шефу.
 */
export async function deleteEntry(entryId: string): Promise<EntryActionState> {
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
    return { error: t.reportDetail.editWindowClosed };
  }

  revalidatePath("/", "layout");

  return OK;
}
