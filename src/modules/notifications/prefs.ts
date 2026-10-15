import type { Tables } from "@/lib/supabase/types.gen";

/** Что человек хочет получать. Само разрешение браузера и подписка устройства — отдельно (`lib/push/client.ts`). */
export interface NotificationPrefs {
  reportReminder: boolean;
  chatMessages: boolean;
  chatChecklists: boolean;
  checklistDone: boolean;
}

export type PrefKey = keyof NotificationPrefs;

/** Название колонки в `notification_prefs` для каждой настройки. */
export const PREF_COLUMNS = {
  reportReminder: "report_reminder",
  chatMessages: "chat_messages",
  chatChecklists: "chat_checklists",
  checklistDone: "checklist_done",
} as const satisfies Record<PrefKey, keyof Tables<"notification_prefs">>;

export const DEFAULT_PREFS: NotificationPrefs = {
  reportReminder: true,
  chatMessages: true,
  chatChecklists: true,
  checklistDone: true,
};

/** Нет строки в базе — всё включено, как и было до появления настроек. */
export function prefsFromRow(row: Tables<"notification_prefs"> | null | undefined): NotificationPrefs {
  if (!row) return { ...DEFAULT_PREFS };

  return {
    reportReminder: row.report_reminder,
    chatMessages: row.chat_messages,
    chatChecklists: row.chat_checklists,
    checklistDone: row.checklist_done,
  };
}

export function isPrefKey(value: unknown): value is PrefKey {
  // `in` пропустил бы и унаследованные имена вроде «__proto__» или «toString».
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(PREF_COLUMNS, value);
}
