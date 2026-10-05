import { idbClear, idbGet, idbPut } from "./idb";

/**
 * Кэш «последнее прочитанное» для экранов: показываем сохранённое сразу,
 * а свежее подгружаем в фоне. Благодаря этому экраны открываются мгновенно,
 * а без интернета остаются видны последние данные.
 *
 * Ключ всегда начинается с id пользователя — на общем телефоне чужие данные
 * не подмешиваются. При выходе кэш очищается целиком (`clearOfflineCache`).
 */

/** Сколько живёт кэш: старше — не показываем (данные слишком давние). */
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14;

interface CacheRecord<T> {
  value: T;
  savedAt: number;
}

/** Пока вкладка открыта — держим и в памяти: повторное открытие экрана без обращения к IndexedDB. */
const memory = new Map<string, CacheRecord<unknown>>();

export async function readCache<T>(key: string): Promise<T | undefined> {
  const fromMemory = memory.get(key) as CacheRecord<T> | undefined;
  if (fromMemory) return fromMemory.value;

  const record = await idbGet<CacheRecord<T>>("cache", key);
  if (!record || Date.now() - record.savedAt > MAX_AGE_MS) return undefined;

  memory.set(key, record);
  return record.value;
}

export function writeCache<T>(key: string, value: T): void {
  const record: CacheRecord<T> = { value, savedAt: Date.now() };

  memory.set(key, record);
  void idbPut("cache", key, record);
}

export async function clearOfflineCache(): Promise<void> {
  memory.clear();
  await idbClear("cache");
}

/**
 * Загружает данные «сначала сохранённое, потом свежее».
 *
 * - есть кэш → `onData(кэш)` сразу, затем `onData(свежее)`;
 * - свежее не загрузилось, а кэш был показан → тихо остаёмся с кэшем (скорее всего нет сети);
 * - свежее не загрузилось и кэша нет → ошибка пробрасывается, как раньше.
 *
 * `isCancelled` — проверка «экран уже ушёл/параметры сменились», чтобы устаревший ответ не затёр новый.
 */
export async function loadWithCache<T>({
  key,
  fetcher,
  onData,
  isCancelled = () => false,
}: {
  key: string;
  fetcher: () => Promise<T>;
  onData: (data: T, source: "cache" | "network") => void;
  isCancelled?: () => boolean;
}): Promise<void> {
  let hadCache = false;

  const cached = await readCache<T>(key);

  if (cached !== undefined && !isCancelled()) {
    hadCache = true;
    onData(cached, "cache");
  }

  try {
    const fresh = await fetcher();

    writeCache(key, fresh);
    if (!isCancelled()) onData(fresh, "network");
  } catch (error) {
    if (!hadCache) throw error;
  }
}
