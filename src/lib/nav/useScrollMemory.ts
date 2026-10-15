"use client";

import { useEffect, useLayoutEffect, type RefObject } from "react";
import { usePathname } from "next/navigation";

import { browserStorage, readMemory, writeMemory } from "./sessionMemory";

/** После системного «назад» восстанавливаем прокрутку только если событие свежее. */
const BACK_WINDOW_MS = 3000;
/** Сколько ждать, пока список догрузится и станет достаточно длинным, чтобы доскроллить. */
const RESTORE_TIMEOUT_MS = 3000;

/**
 * Запоминает, докуда прокручен контейнер на каждом экране, и возвращает на то же место, когда человек
 * вернулся «назад» (стрелка или свайп). Прокручивается не страница, а контейнер в `AppShell`,
 * поэтому штатное восстановление браузера и Next здесь не срабатывает.
 *
 * На обычный переход вперёд (вкладка, ссылка) ничего не делает.
 */
export function useScrollMemory(ref: RefObject<HTMLElement | null>) {
  const pathname = usePathname();

  // Сохраняем позицию, пока человек листает этот экран.
  useEffect(() => {
    const el = ref.current;
    const storage = browserStorage();
    if (!el || !storage) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const save = () => {
      // Скрытая ветка вёрстки (display:none) всегда на нуле — её позицию не пишем.
      if (el.offsetParent === null) return;
      writeMemory(storage, `scroll:${pathname}`, el.scrollTop);
    };
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(save, 120);
    };

    el.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      el.removeEventListener("scroll", onScroll);
    };
  }, [ref, pathname]);

  // Возврат «назад»: событие `popstate` приходит раньше смены адреса.
  useLayoutEffect(() => {
    const el = ref.current;
    const storage = browserStorage();
    if (!el || !storage) return;

    const wentBack = Number(window.sessionStorage.getItem("vk-nav:back-at") ?? 0);
    if (Date.now() - wentBack > BACK_WINDOW_MS) return;

    const target = readMemory<number>(storage, `scroll:${pathname}`);
    if (!target) return;

    let frame = 0;
    const startedAt = Date.now();
    const cancel = () => cancelAnimationFrame(frame);

    const tryRestore = () => {
      // Список мог ещё не догрузиться: ждём, пока контент станет достаточно высоким.
      const reachable = el.scrollHeight - el.clientHeight;
      el.scrollTop = Math.min(target, Math.max(reachable, 0));

      if (reachable >= target || Date.now() - startedAt > RESTORE_TIMEOUT_MS) return;
      frame = requestAnimationFrame(tryRestore);
    };

    tryRestore();
    // Человек сам начал листать — не мешаем.
    el.addEventListener("touchstart", cancel, { once: true, passive: true });
    el.addEventListener("wheel", cancel, { once: true, passive: true });

    return () => {
      cancel();
      el.removeEventListener("touchstart", cancel);
      el.removeEventListener("wheel", cancel);
    };
  }, [ref, pathname]);
}

/** Один раз на приложение: помечает системный «назад» (стрелка, свайп, `router.back()`). */
export function useBackNavigationMarker() {
  useEffect(() => {
    const mark = () => {
      try {
        window.sessionStorage.setItem("vk-nav:back-at", String(Date.now()));
      } catch {
        /* нет хранилища — просто не восстановим позицию */
      }
    };

    window.addEventListener("popstate", mark);

    return () => window.removeEventListener("popstate", mark);
  }, []);
}
