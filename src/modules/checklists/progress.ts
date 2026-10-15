/** Сколько пунктов чеклиста отмечено. Пункт отмечен, если у него есть `done_at`. */
export interface Progress {
  done: number;
  total: number;
}

export function countProgress(items: readonly { done_at: string | null }[]): Progress {
  return { done: items.filter((item) => item.done_at !== null).length, total: items.length };
}

/** Чеклист выполнен, когда в нём есть пункты и все отмечены (пустой список «выполненным» не считается). */
export function isComplete(progress: Progress): boolean {
  return progress.total > 0 && progress.done === progress.total;
}
