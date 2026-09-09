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

  const supabase = await createClient();
  const { error } = await supabase.from("work_entries").insert({
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
  });

  if (error) {
    // `ended_at` тут всегда задан, поэтому индекс «одна открытая смена»
    // не участвует — реальная причина отказа почти наверняка не в нём.
    return { error: t.manualTime.saveError };
  }

  revalidatePath("/", "layout");

  return OK;
}
