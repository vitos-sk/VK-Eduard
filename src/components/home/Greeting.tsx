"use client";

import { useSyncExternalStore } from "react";

import { fmt } from "@/lib/format";
import type { Dict } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";

/** Раз на хвилину перевіряємо годину: застосунок може бути відкритий довго. */
function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 60_000);
  return () => clearInterval(id);
}

function greetingTemplate(hour: number, t: Dict): string {
  if (hour >= 5 && hour < 12) return t.home.greetingMorning;
  if (hour >= 12 && hour < 18) return t.home.greetingDay;
  return t.home.greetingEvening;
}

/**
 * Приветствие по местному времени устройства. Считается на клиенте: сервер
 * живёт в другом часовом поясе. До гидрации (серверный снапшот) — нейтральное
 * «Вітаю», затем сразу подменяется без расхождения гидрации.
 */
export function Greeting({ name }: { name: string }) {
  const t = useT();
  const hour = useSyncExternalStore(
    subscribe,
    () => new Date().getHours(),
    () => null,
  );

  const template = hour === null ? t.home.greetingNeutral : greetingTemplate(hour, t);
  return <>{fmt(template, { name })}</>;
}
