import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_URL } from "./env";
import type { Database } from "./types.gen";

function requireServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error(
      "Немає змінної оточення SUPABASE_SERVICE_ROLE_KEY. Скопіюйте .env.example у .env.local.",
    );
  }

  return key;
}

const SERVICE_ROLE_KEY = requireServiceRoleKey();

/**
 * Клієнт із сервісним ключем — обходить RLS повністю. Тільки для Admin API
 * (`auth.admin.createUser`/`deleteUser`) і вставки `profiles` при заведенні
 * співробітника: для `profiles` немає INSERT-політики (RLS навмисно не
 * пускає туди нікого, крім сервісної ролі — так само, як `seed.sql`).
 *
 * `import "server-only"` не дає цьому файлу потрапити в клієнтський бандл.
 * Ключ і сам клієнт ніколи не повинні йти далі Server Action — жодних
 * пропсів у клієнтські компоненти, жодного повернення в JSON-відповіді.
 */
export function createAdminClient() {
  return createSupabaseClient<Database, "public">(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
