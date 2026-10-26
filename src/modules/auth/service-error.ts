/**
 * Отказ самого сервиса входа, а не неверные данные пользователя: нет связи с Supabase, проект ограничен
 * (402 — исчерпан лимит тарифа), ограничение частоты (429) или сбой на их стороне (5xx).
 * Неверный пароль или email — это 400 `invalid_credentials`; только его показываем как «невірний пароль».
 */
export function isServiceError(error: { status?: number }): boolean {
  const { status } = error;

  return status === undefined || status === 0 || status === 402 || status === 429 || status >= 500;
}
