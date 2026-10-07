import { createClient } from "@/lib/supabase/client";
import type { ManualEntryInput } from "@/modules/entries/actions";
import { findOverlappingEntry } from "@/modules/entries/queries";

import { idbAll, idbDelete, idbPut } from "./idb";
import { classifyInsertError, OUTBOX_CHANGED_EVENT } from "./outbox-rules";

export { OUTBOX_CHANGED_EVENT };

/**
 * Очередь «Додати час» без интернета.
 *
 * Запись сохраняется в телефоне (IndexedDB) вместе с `client_id` — ключом
 * идемпотентности: в базе он уникален, поэтому даже если запись уйдёт дважды
 * (ответ потерялся, вкладку закрыли на середине), дубля не будет.
 *
 * Отправка идёт напрямую из браузера (`work_entries`, RLS та же, что и у сервера),
 * а не через серверное действие: у серверных действий id меняется при каждом
 * деплое, и очередь, пролежавшая в телефоне до обновления, не смогла бы уйти.
 *
 * Фоновой отправки на iPhone нет — очередь уходит, когда приложение открыто:
 * при запуске, при возвращении сети и при возвращении на вкладку.
 */

export interface OutboxEntry {
  /** `client_id` записи в базе. */
  id: string;
  userId: string;
  companyId: string;
  createdAt: number;
  input: ManualEntryInput;
  attempts: number;
  /** Сервер отверг запись (не «нет сети»): сама не уйдёт, пока пользователь не вмешается. */
  rejected: boolean;
}

/** Сколько раз пробуем отправить, прежде чем считать, что запись отклонена навсегда. */
const MAX_ATTEMPTS = 5;

function notifyChanged(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OUTBOX_CHANGED_EVENT));
}

export function newClientId(): string {
  return crypto.randomUUID();
}

export async function enqueueManualEntry(params: {
  id: string;
  userId: string;
  companyId: string;
  input: ManualEntryInput;
}): Promise<void> {
  const entry: OutboxEntry = { ...params, createdAt: Date.now(), attempts: 0, rejected: false };

  await idbPut("outbox", entry.id, entry);
  notifyChanged();
}

export async function listOutbox(userId: string): Promise<OutboxEntry[]> {
  const all = await idbAll<OutboxEntry>("outbox");

  return all.filter((entry) => entry.userId === userId).sort((a, b) => a.createdAt - b.createdAt);
}

export async function discardOutboxEntry(id: string): Promise<void> {
  await idbDelete("outbox", id);
  notifyChanged();
}

let flushing: Promise<{ sent: number; rejected: number }> | null = null;

/** Отправляет очередь пользователя. Одновременно выполняется только одна отправка. */
export function flushOutbox(userId: string): Promise<{ sent: number; rejected: number }> {
  flushing ??= doFlush(userId).finally(() => {
    flushing = null;
  });

  return flushing;
}

async function doFlush(userId: string): Promise<{ sent: number; rejected: number }> {
  const supabase = createClient();
  let sent = 0;
  let rejected = 0;

  for (const entry of await listOutbox(userId)) {
    if (entry.rejected) continue;

    const { input } = entry;

    // Это время уже внесено другим способом (например, через звіт, пока запись лежала в очереди) —
    // отправка создала бы дубль. Такая запись сама не уйдёт: помечаем отклонённой, решает пользователь.
    try {
      const overlap = await findOverlappingEntry(
        supabase,
        entry.userId,
        { workDate: input.workDate, startedAt: input.startedAt, endedAt: input.endedAt },
        { clientId: entry.id },
      );

      if (overlap) {
        await idbPut("outbox", entry.id, { ...entry, attempts: MAX_ATTEMPTS, rejected: true });
        rejected += 1;
        continue;
      }
    } catch (checkError) {
      // Не удалось проверить: без связи ждём её возвращения, иначе пробуем в следующий раз.
      const online = typeof navigator === "undefined" ? true : navigator.onLine;

      if (classifyInsertError(checkError as { code?: string; message?: string }, online) === "offline") break;
      continue;
    }

    const { error } = await supabase.from("work_entries").insert({
      client_id: entry.id,
      company_id: entry.companyId,
      author_id: entry.userId,
      site_id: input.siteId,
      work_date: input.workDate,
      started_at: input.startedAt,
      ended_at: input.endedAt,
      break_start: input.breakStart,
      break_end: input.breakEnd,
      description: input.description,
      source: "manual",
    });

    const outcome = classifyInsertError(error, typeof navigator === "undefined" ? true : navigator.onLine);

    if (outcome === "sent") {
      await idbDelete("outbox", entry.id);
      sent += 1;
    } else if (outcome === "offline") {
      // Связи нет — дальше пробовать бессмысленно, оставляем всё как есть.
      break;
    } else {
      const attempts = entry.attempts + 1;
      const isRejected = attempts >= MAX_ATTEMPTS;

      await idbPut("outbox", entry.id, { ...entry, attempts, rejected: isRejected });
      if (isRejected) rejected += 1;
    }
  }

  notifyChanged();

  return { sent, rejected };
}
