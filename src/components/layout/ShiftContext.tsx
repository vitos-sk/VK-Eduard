"use client";

import { createContext, useContext, useEffect } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import type { WorkEntry } from "@/modules/entries/types";

const ShiftContext = createContext<WorkEntry | null>(null);

/**
 * Единственный источник правды об открытой смене для всех экранов и листа «+».
 * Значение читает серверный layout; любое действие со сменой делает
 * `revalidatePath("/", "layout")` + `router.refresh()`, поэтому «Головна»,
 * «Години» и быстрые действия всегда показывают одно и то же. При возврате
 * на вкладку/окно дообновляемся — смена могла измениться с другого устройства.
 */
export function ShiftProvider({
  openEntry,
  children,
}: {
  openEntry: WorkEntry | null;
  children: ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };

    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);

    return () => {
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenVisible);
    };
  }, [router]);

  return <ShiftContext.Provider value={openEntry}>{children}</ShiftContext.Provider>;
}

export function useOpenShift(): WorkEntry | null {
  return useContext(ShiftContext);
}
