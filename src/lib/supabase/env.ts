/**
 * Адрес и публичный ключ проекта. Публичный ключ безопасно отдавать в браузер —
 * доступ к данным определяет RLS, а не секретность ключа.
 *
 * Падаем громко на старте, а не тихо при первом запросе: пустой ключ даёт
 * загадочную ошибку «Invalid API key» уже в рантайме у пользователя.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Немає змінної оточення ${name}. Скопіюйте .env.example у .env.local.`,
    );
  }
  return value;
}

export const SUPABASE_URL = required(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);

export const SUPABASE_KEY = required(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
