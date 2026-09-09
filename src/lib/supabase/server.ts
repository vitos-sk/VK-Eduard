import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { SUPABASE_KEY, SUPABASE_URL } from "./env";
import type { Database } from "./types.gen";

/**
 * Клиент для Server Components, Server Actions и Route Handlers.
 *
 * Новый на каждый запрос — общий клиент утёк бы чужой сессией.
 * Запись кук из Server Component запрещена самим Next, поэтому `setAll`
 * молча проглатывает ошибку: обновление сессии всё равно делает `proxy.ts`.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component: куки уже отправлены. Их обновит proxy.ts.
        }
      },
    },
  });
}
