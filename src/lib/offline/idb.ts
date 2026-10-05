/**
 * Минимальная обёртка над IndexedDB — без зависимостей.
 * Два хранилища: `cache` (последние прочитанные данные экранов) и `outbox`
 * (записи, сделанные без интернета и ещё не отправленные).
 *
 * Все функции безопасны: если IndexedDB недоступна (приватный режим, SSR),
 * чтение возвращает `undefined`/`[]`, запись молча ничего не делает —
 * приложение просто работает как раньше, без офлайна.
 */

const DB_NAME = "vk-offline";
const DB_VERSION = 1;

export type StoreName = "cache" | "outbox";

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);

  dbPromise ??= new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("cache")) db.createObjectStore("cache");
        if (!db.objectStoreNames.contains("outbox")) db.createObjectStore("outbox");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

  return dbPromise;
}

function run<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  action: (objectStore: IDBObjectStore) => IDBRequest<T>,
): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve) => {
        if (!db) return resolve(undefined);

        try {
          const request = action(db.transaction(store, mode).objectStore(store));
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => resolve(undefined);
        } catch {
          resolve(undefined);
        }
      }),
  );
}

export function idbGet<T>(store: StoreName, key: string): Promise<T | undefined> {
  return run<T>(store, "readonly", (s) => s.get(key));
}

export function idbPut(store: StoreName, key: string, value: unknown): Promise<unknown> {
  return run(store, "readwrite", (s) => s.put(value, key));
}

export function idbDelete(store: StoreName, key: string): Promise<unknown> {
  return run(store, "readwrite", (s) => s.delete(key));
}

export function idbClear(store: StoreName): Promise<unknown> {
  return run(store, "readwrite", (s) => s.clear());
}

export async function idbAll<T>(store: StoreName): Promise<T[]> {
  return (await run<T[]>(store, "readonly", (s) => s.getAll() as IDBRequest<T[]>)) ?? [];
}
