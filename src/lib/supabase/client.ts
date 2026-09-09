import { createBrowserClient } from "@supabase/ssr";

import { SUPABASE_KEY, SUPABASE_URL } from "./env";
import type { Database } from "./types.gen";

/**
 * Клиент для Client Components. Сессия лежит в куках — их же читает сервер,
 * поэтому вход, сделанный на клиенте, виден серверу без дополнительной синхронизации.
 *
 * Создавать можно сколько угодно раз: библиотека возвращает синглтон на вкладку.
 */
export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_KEY);
}
