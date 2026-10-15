const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Адрес вида `/checklists/абв` не должен дойти до базы: она ответила бы ошибкой синтаксиса, а не «не найдено». */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
