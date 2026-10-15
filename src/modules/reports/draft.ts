/**
 * Чернетка нового звіту: всё, что человек уже ввёл в форму, сохраняется на телефоне само и возвращается,
 * если форму закрыли случайно (свайп назад, свёрнули приложение, разрядился телефон).
 * Здесь вся логика без браузера и React: что считается чернеткой, как её прочитать безопасно и что выбросить.
 * Фото в чернетку не входят: они добавляются уже после сохранения звіту (форма на втором шаге).
 */

export interface ReportDraftFields {
  siteId: string | null;
  /** Дата звіту, `YYYY-MM-DD`. */
  dateKey: string;
  categoryIds: string[];
  otherText: string;
  description: string;
  problemNote: string;
  withTime: boolean;
  startAt: string;
  endAt: string;
  breakMin: number;
  withTravel: boolean;
  travelStart: string;
  travelEnd: string;
  km: string;
}

interface StoredDraft {
  version: number;
  savedAt: number;
  fields: ReportDraftFields;
}

const VERSION = 1;

/** Чернетка старше месяца уже не нужна: звіт, скорее всего, давно сдан иначе. */
export const DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Ключ привязан к человеку: на общем телефоне чужую чернетку не показать. При выходе из аккаунта чернетка
 * остаётся: у человека мог просто истечь вход, и терять из-за этого введённый звіт нельзя. Через месяц она уходит сама.
 */
export function draftKey(userId: string): string {
  return `vk-report-draft:${userId}`;
}

/**
 * Есть ли в форме то, что жалко потерять. Объект сам по себе (он подставляется из прошлого звіту) и значения
 * времени по умолчанию чернеткой не считаются: форма, которую только открыли, ничего не сохраняет.
 */
export function hasDraftContent(fields: ReportDraftFields): boolean {
  return (
    fields.description.trim() !== "" ||
    fields.problemNote.trim() !== "" ||
    fields.otherText.trim() !== "" ||
    fields.categoryIds.length > 0 ||
    fields.withTime ||
    fields.withTravel ||
    fields.km.trim() !== ""
  );
}

export function serializeDraft(fields: ReportDraftFields, now: number): string {
  const stored: StoredDraft = { version: VERSION, savedAt: now, fields };

  return JSON.stringify(stored);
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export interface KnownIds {
  siteIds: ReadonlySet<string>;
  categoryIds: ReadonlySet<string>;
}

/**
 * Читает чернетку из строки. Чужое, битое, старое и пустое возвращает как «чернетки нет», а не как ошибку:
 * из памяти телефона приходит что угодно. Объекты и виды работ, которых уже нет (архив, удалили), отбрасываются.
 */
export function parseDraft(raw: string | null, now: number, known: KnownIds): ReportDraftFields | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(parsed) || parsed.version !== VERSION || typeof parsed.savedAt !== "number") return null;
  if (now - parsed.savedAt > DRAFT_MAX_AGE_MS || parsed.savedAt > now + 60_000) return null;

  const f = parsed.fields;
  if (!isRecord(f)) return null;

  const strings = [f.otherText, f.description, f.problemNote, f.km];
  const times = [f.startAt, f.endAt, f.travelStart, f.travelEnd];
  if (!strings.every((value) => typeof value === "string")) return null;
  if (!times.every((value) => typeof value === "string" && TIME.test(value))) return null;
  if (typeof f.dateKey !== "string" || !DATE_KEY.test(f.dateKey)) return null;
  if (typeof f.withTime !== "boolean" || typeof f.withTravel !== "boolean") return null;
  if (typeof f.breakMin !== "number" || !Number.isFinite(f.breakMin) || f.breakMin < 0 || f.breakMin > 600) return null;
  if (!Array.isArray(f.categoryIds) || !f.categoryIds.every((id) => typeof id === "string")) return null;
  if (f.siteId !== null && typeof f.siteId !== "string") return null;

  const fields: ReportDraftFields = {
    siteId: typeof f.siteId === "string" && known.siteIds.has(f.siteId) ? f.siteId : null,
    dateKey: f.dateKey,
    categoryIds: (f.categoryIds as string[]).filter((id) => known.categoryIds.has(id)),
    otherText: f.otherText as string,
    description: f.description as string,
    problemNote: f.problemNote as string,
    withTime: f.withTime,
    startAt: f.startAt as string,
    endAt: f.endAt as string,
    breakMin: f.breakMin,
    withTravel: f.withTravel,
    travelStart: f.travelStart as string,
    travelEnd: f.travelEnd as string,
    km: f.km as string,
  };

  return hasDraftContent(fields) ? fields : null;
}

/** Хранилище браузера в минимальном виде: так логику можно проверять без браузера. */
export type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

/** Читает чернетку человека; любая неполадка хранилища (приватный режим, переполнение) — «чернетки нет». */
export function readDraft(storage: DraftStorage, userId: string, now: number, known: KnownIds): ReportDraftFields | null {
  try {
    return parseDraft(storage.getItem(draftKey(userId)), now, known);
  } catch {
    return null;
  }
}

/** Пишет чернетку; если в форме уже ничего нет, прежняя чернетка удаляется. Ошибки хранилища не мешают заполнять форму. */
export function writeDraft(storage: DraftStorage, userId: string, fields: ReportDraftFields, now: number): void {
  try {
    if (hasDraftContent(fields)) storage.setItem(draftKey(userId), serializeDraft(fields, now));
    else storage.removeItem(draftKey(userId));
  } catch {
    /* хранилище недоступно или переполнено: чернетки не будет, форма работает как раньше */
  }
}

export function clearDraft(storage: DraftStorage, userId: string): void {
  try {
    storage.removeItem(draftKey(userId));
  } catch {
    /* не критично */
  }
}
