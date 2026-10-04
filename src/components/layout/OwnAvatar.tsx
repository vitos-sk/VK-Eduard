"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";

/** Фото вошедшего пользователя (подписанная ссылка) — для аватара в шапках и сайдбаре. */
const OwnAvatarContext = createContext<string | null>(null);

export function OwnAvatarProvider({ url, children }: { url: string | null; children: ReactNode }) {
  return <OwnAvatarContext.Provider value={url}>{children}</OwnAvatarContext.Provider>;
}

export function useOwnAvatarUrl(): string | null {
  return useContext(OwnAvatarContext);
}
