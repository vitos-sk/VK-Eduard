import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "@/lib/supabase/types.gen";
import { findOverlap, type ShiftSpan } from "@/modules/time/overlap";
import type { WorkEntry, WorkEntryDetail, WorkEntryWithNames, WorkEntryWithPhotos } from "./types";

type Client = SupabaseClient<Database>;

/**
 * Читающие запросы к `work_entries`. Принимают клиент, а не создают его сами —
 * работают одинаково с серверным клиентом (первичная загрузка страницы)
 * и с браузерным (переключение периода без похода на сервер).
 *
 * RLS сам ограничивает видимость: рабочему передавать `authorId` кого-то
 * другого бессмысленно — база всё равно отдаст только его записи или пусто.
 */

/** Все записи автора за один день работы, от ранней к поздней. */
export async function getEntriesForDate(
  supabase: Client,
  authorId: string,
  workDate: string,
): Promise<WorkEntry[]> {
  const { data, error } = await supabase
    .from("work_entries")
    .select("*")
    .eq("author_id", authorId)
    .eq("work_date", workDate)
    .order("started_at", { ascending: true });

  if (error) throw error;

  return data ?? [];
}

/**
 * Лента «Звіти»: записи автора вместе с их фото, от новых к старым.
 * Фильтры (Усі / Без опису / З фото), поиск и группировка по датам —
 * на клиенте, поверх этого одного запроса: масштаб компании (десятки
 * человек) не требует серверной пагинации на этом этапе.
 */
export async function getEntriesFeed(
  supabase: Client,
  authorId: string,
): Promise<WorkEntryWithPhotos[]> {
  const { data, error } = await supabase
    .from("work_entries")
    .select("*, entry_photos(*)")
    .eq("author_id", authorId)
    .order("work_date", { ascending: false })
    .order("started_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as WorkEntryWithPhotos[];
}

/**
 * Одна запись с фото и данными автора — для детальной страницы
 * `/reports/[id]`. Автор нужен отдельно от зрителя: шеф открывает записи
 * всей команды (RLS это разрешает), подпись и норма должны быть его.
 */
export async function getEntryWithPhotos(
  supabase: Client,
  entryId: string,
): Promise<WorkEntryDetail | null> {
  const { data, error } = await supabase
    .from("work_entries")
    .select("*, entry_photos(*), profiles(full_name, daily_norm_minutes)")
    .eq("id", entryId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { profiles, ...entry } = data as WorkEntryWithPhotos & {
    profiles: { full_name: string; daily_norm_minutes: number } | null;
  };

  return {
    ...entry,
    author_full_name: profiles?.full_name ?? "",
    author_daily_norm_minutes: profiles?.daily_norm_minutes ?? 480,
  };
}

type CompanyEntryRow = WorkEntry & {
  profiles: { full_name: string } | null;
  sites: { name: string } | null;
};

/**
 * Все смены компании за диапазон дат вместе с именем автора и объекта —
 * таблица «Зміни за місяць» внизу экрана «Години».
 *
 * Фильтр только по `company_id` — RLS сама решает, что вернуть: рабочему
 * (`entries_select`) — только его собственные строки, шефу (`is_boss()`) —
 * все по компании. Дублировать эту развилку в коде не нужно.
 */
export async function getCompanyEntriesInRange(
  supabase: Client,
  companyId: string,
  fromDate: string,
  toDate: string,
): Promise<WorkEntryWithNames[]> {
  const { data, error } = await supabase
    .from("work_entries")
    .select("*, profiles(full_name), sites(name)")
    .eq("company_id", companyId)
    .gte("work_date", fromDate)
    .lte("work_date", toDate)
    .order("work_date", { ascending: false })
    // В пределах дня — сначала добавленное последним: свежая запись за сегодня оказывается
    // первой, а запись, добавленная задним числом, встаёт на своё место по дате.
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as CompanyEntryRow[]).map(({ profiles, sites, ...entry }) => ({
    ...entry,
    author_full_name: profiles?.full_name ?? "",
    site_name: sites?.name ?? null,
  }));
}

/**
 * Смены компании за диапазон дат из вьюхи `entry_hours` — с уже готовыми
 * `worked_minutes` / `overtime_minutes` / `photo_count`. Только для
 * `api/export/route.ts`: та же RLS-развилка по ролі, что и в
 * `getCompanyEntriesInRange`.
 */
export async function getCompanyEntryHoursInRange(
  supabase: Client,
  companyId: string,
  fromDate: string,
  toDate: string,
): Promise<Tables<"entry_hours">[]> {
  const { data, error } = await supabase
    .from("entry_hours")
    .select("*")
    .eq("company_id", companyId)
    .gte("work_date", fromDate)
    .lte("work_date", toDate)
    .order("work_date", { ascending: true })
    .order("started_at", { ascending: true });

  if (error) throw error;

  return data ?? [];
}

/** Записи автора в диапазоне дат включительно — для сводок «Тиждень» / «Місяць». */
export async function getEntriesInRange(
  supabase: Client,
  authorId: string,
  fromDate: string,
  toDate: string,
): Promise<WorkEntry[]> {
  const { data, error } = await supabase
    .from("work_entries")
    .select("*")
    .eq("author_id", authorId)
    .gte("work_date", fromDate)
    .lte("work_date", toDate)
    .order("work_date", { ascending: true })
    .order("started_at", { ascending: true });

  if (error) throw error;

  return data ?? [];
}

/** `YYYY-MM-DD` со сдвигом на `delta` дней. */
function shiftDateKey(dateKey: string, delta: number): string {
  const [year = 1970, month = 1, day = 1] = dateKey.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day + delta)).toISOString().slice(0, 10);
}

/**
 * Закрытая смена автора, которая по времени пересекается с `candidate`, — или `null`.
 * Это защита от дублей: то же время нельзя внести дважды (через отчёт и через «Додати час»,
 * повторным нажатием, повтором из офлайн-очереди). Смотрим день до и день после: ночная смена
 * заходит на соседние даты. `ignore.id` — запись, которую правят; `ignore.clientId` — запись, которую
 * эта же отправка уже сохранила раньше (повтор после потерянного ответа).
 *
 * Если проверить не вышло (нет связи, нет доступа) — ошибка пробрасывается: лучше не сохранить
 * и показать сообщение, чем молча пропустить дубль.
 */
export async function findOverlappingEntry(
  supabase: Client,
  authorId: string,
  candidate: ShiftSpan,
  ignore: { id?: string; clientId?: string } = {},
): Promise<(ShiftSpan & { id: string }) | null> {
  const { data, error } = await supabase
    .from("work_entries")
    .select("id, client_id, work_date, started_at, ended_at")
    .eq("author_id", authorId)
    .not("ended_at", "is", null)
    .gte("work_date", shiftDateKey(candidate.workDate, -1))
    .lte("work_date", shiftDateKey(candidate.workDate, 1));

  if (error) throw error;

  const existing = (data ?? [])
    .filter((row) => row.client_id !== ignore.clientId)
    .map((row) => ({
    id: row.id,
    workDate: row.work_date,
    startedAt: row.started_at,
    endedAt: row.ended_at,
  }));

  return findOverlap(candidate, existing, ignore.id);
}
