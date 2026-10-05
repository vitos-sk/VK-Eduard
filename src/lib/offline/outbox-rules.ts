/** Код Postgres «нарушение уникальности» — запись с таким `client_id` уже есть в базе. */
const UNIQUE_VIOLATION = "23505";

export const OUTBOX_CHANGED_EVENT = "vk-outbox-changed";

export type InsertOutcome = "sent" | "offline" | "rejected";

/** Что делать с ответом базы на вставку записи из очереди. */
export function classifyInsertError(
  error: { code?: string; message?: string } | null,
  isOnline: boolean,
): InsertOutcome {
  if (!error) return "sent";
  if (error.code === UNIQUE_VIOLATION) return "sent";

  // Нет связи: supabase-js возвращает ошибку без кода с текстом про fetch/сеть.
  const looksLikeNetwork = !error.code && /fetch|network|load failed|timeout/i.test(error.message ?? "");
  if (!isOnline || looksLikeNetwork) return "offline";

  return "rejected";
}
