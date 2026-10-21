/** Сколько пунктов чеклиста отмечено. Пункт отмечен, если у него есть `done_at`. */
export interface Progress {
  done: number;
  total: number;
}

export function countProgress(items: readonly { done_at: string | null }[]): Progress {
  return { done: items.filter((item) => item.done_at !== null).length, total: items.length };
}

/**
 * Подпись под пунктом: имя того, кто его отметил. Свои отметки не подписываем (иначе в личном чеклисте имя
 * повторялось бы под каждым пунктом); не отмечен или имя неизвестно — подписи нет.
 */
export function doneByOther(
  item: { doneAt: string | null; doneById: string | null; doneByName: string | null },
  meId: string,
): string | null {
  if (item.doneAt === null || item.doneById === null || item.doneById === meId) return null;

  return item.doneByName;
}

/** Чеклист выполнен, когда в нём есть пункты и все отмечены (пустой список «выполненным» не считается). */
export function isComplete(progress: Progress): boolean {
  return progress.total > 0 && progress.done === progress.total;
}
