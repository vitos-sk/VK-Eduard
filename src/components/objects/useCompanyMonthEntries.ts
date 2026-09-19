"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { endOfMonth, startOfMonth } from "date-fns";

import { createClient } from "@/lib/supabase/client";
import { getCompanyEntriesInRange } from "@/modules/entries/queries";
import type { WorkEntryWithNames } from "@/modules/entries/types";
import { dateKeyOf } from "@/modules/time/calc";

export function addMonthsSafe(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

/**
 * Записи компанії за місяць (RLS віддає boss-у всі). Початковий місяць —
 * поточний; `initialEntries` — вже завантажені сервером записи для нього
 * (без зайвого запиту на першому кадрі).
 */
export function useCompanyMonthEntries(
  companyId: string,
  initialEntries: readonly WorkEntryWithNames[] | null,
) {
  const supabase = useMemo(() => createClient(), []);
  const [month, setMonth] = useState(() => new Date());
  const [entries, setEntries] = useState<readonly WorkEntryWithNames[]>(initialEntries ?? []);
  const [loaded, setLoaded] = useState(initialEntries !== null);
  const [isLoading, startTransition] = useTransition();
  const skipFirst = useRef(initialEntries !== null);

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }

    let cancelled = false;
    const from = dateKeyOf(startOfMonth(month));
    const to = dateKeyOf(endOfMonth(month));

    startTransition(async () => {
      try {
        const data = await getCompanyEntriesInRange(supabase, companyId, from, to);
        if (!cancelled) {
          setEntries(data);
          setLoaded(true);
        }
      } catch {
        // Мережа моргнула — лишаємо попередні дані.
      }
    });

    return () => {
      cancelled = true;
    };
  }, [supabase, companyId, month]);

  return { month, setMonth, entries, loaded, isLoading };
}
