"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { listOutbox } from "./outbox";
import { OUTBOX_CHANGED_EVENT } from "./outbox-rules";

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);

  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/** Есть ли сейчас связь. На сервере считаем, что есть (баннер «нет связи» не должен мигать при загрузке). */
export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

const subscribeNever = () => () => {};

function readSavedAt(): number | null {
  const content = document.querySelector('meta[name="vk-saved-at"]')?.getAttribute("content");
  const savedAt = Number(content);

  return content && Number.isFinite(savedAt) ? savedAt : null;
}

/**
 * Когда сохранена копия страницы, если она открыта из памяти телефона (а не из сети): воркер кладёт эту метку
 * в `<head>` при сохранении (`public/sw-lib.js`, `injectSavedAt`). `null` — страница пришла из сети.
 * Читаем один раз: при следующем переходе без сети страница грузится заново и получает свою метку.
 */
export function useSavedAt(): number | null {
  return useSyncExternalStore(subscribeNever, readSavedAt, () => null);
}

/** Сколько записей ждёт отправки и сколько из них сервер отверг. */
export function useOutboxCounts(userId: string): { pending: number; rejected: number } {
  const [counts, setCounts] = useState({ pending: 0, rejected: 0 });

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      void listOutbox(userId).then((entries) => {
        if (cancelled) return;

        const rejected = entries.filter((entry) => entry.rejected).length;
        setCounts({ pending: entries.length - rejected, rejected });
      });
    };

    refresh();
    window.addEventListener(OUTBOX_CHANGED_EVENT, refresh);

    return () => {
      cancelled = true;
      window.removeEventListener(OUTBOX_CHANGED_EVENT, refresh);
    };
  }, [userId]);

  return counts;
}
