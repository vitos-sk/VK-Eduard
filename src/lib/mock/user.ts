import type { User } from "@/lib/types";

/**
 * Фиксированная «сегодняшняя» дата — 30 липня 2025, середа.
 * `new Date()` для отображаемых данных не используем, иначе моки разъезжаются.
 * Живой `new Date()` допустим только для тиканья таймера.
 */
export const TODAY = new Date(2025, 6, 30);

/** Вчерашняя дата — 29 липня 2025. */
export const YESTERDAY = new Date(2025, 6, 29);

export const currentUser: User = {
  id: "u-1",
  name: "Віталік",
  role: "Монтажник",
  initials: "В",
  unreadCount: 2,
};
