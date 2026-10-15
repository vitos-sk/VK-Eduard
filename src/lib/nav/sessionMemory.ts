/**
 * Короткая память экрана на время сеанса: вкладка, фильтр, месяц, позиция прокрутки.
 * Нужна, чтобы после «назад» из отчёта человек видел тот же список на том же месте.
 *
 * Лежит в `sessionStorage` (живёт, пока открыта вкладка/приложение, между пользователями не делится)
 * и устаревает через полчаса: открыли приложение утром — экран должен быть чистым, а не вчерашним.
 */
export interface MemoryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const PREFIX = "vk-nav:";

/** Через сколько запись считается «вчерашней» и игнорируется. */
export const MEMORY_TTL_MS = 30 * 60 * 1000;

export function readMemory<T>(storage: MemoryStorage, key: string, now = Date.now()): T | undefined {
  try {
    const raw = storage.getItem(PREFIX + key);
    if (!raw) return undefined;

    const entry = JSON.parse(raw) as { at: number; value: T };
    if (typeof entry.at !== "number" || now - entry.at > MEMORY_TTL_MS) return undefined;

    return entry.value;
  } catch {
    return undefined;
  }
}

export function writeMemory<T>(storage: MemoryStorage, key: string, value: T, now = Date.now()): void {
  try {
    storage.setItem(PREFIX + key, JSON.stringify({ at: now, value }));
  } catch {
    /* приватный режим или переполнение — не критично: экран просто не запомнится */
  }
}

/** `sessionStorage` или `null` (сервер, запрещённый доступ). */
export function browserStorage(): MemoryStorage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}
