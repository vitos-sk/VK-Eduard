"use client";

import { useCallback, useLayoutEffect, useState, type Dispatch, type SetStateAction } from "react";

import { browserStorage, readMemory, writeMemory } from "./sessionMemory";

/**
 * `useState`, который помнит значение до конца сеанса (см. `sessionMemory`).
 *
 * Первый рендер всегда с `initial` — сервер и браузер выдают одну и ту же разметку, иначе гидрация сломается.
 * Запомненное значение подставляется сразу после, до первой отрисовки, поэтому мигания нет.
 * Пишет в хранилище только тот экземпляр, в котором значение поменял человек: на десктопе
 * приложение смонтировано дважды (телефонная и широкая ветки), и спящая копия не должна затирать данные.
 */
export function useSessionState<T>(
  key: string,
  initial: T,
  codec?: { encode: (value: T) => unknown; decode: (raw: unknown) => T | undefined },
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initial);

  useLayoutEffect(() => {
    const storage = browserStorage();
    if (!storage) return;

    const stored = readMemory<unknown>(storage, key);
    if (stored === undefined) return;

    const restored = codec ? codec.decode(stored) : (stored as T);
    // Подставить запомненное после гидрации — как раз тот случай, ради которого эффект и нужен.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (restored !== undefined) setValue(restored);
    // `codec` объявляют снаружи один раз; `key` не меняется за жизнь экрана
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback<Dispatch<SetStateAction<T>>>(
    (action) => {
      setValue((current) => {
        const next = typeof action === "function" ? (action as (prev: T) => T)(current) : action;
        const storage = browserStorage();
        if (storage) writeMemory(storage, key, codec ? codec.encode(next) : next);

        return next;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  return [value, set];
}

/** Кодек для `Date`: хранится строкой, битая строка → значение по умолчанию. */
export const dateCodec = {
  encode: (value: Date) => value.toISOString(),
  decode: (raw: unknown) => {
    const date = typeof raw === "string" ? new Date(raw) : null;

    return date && !Number.isNaN(date.getTime()) ? date : undefined;
  },
};
