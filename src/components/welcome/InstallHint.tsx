"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share } from "lucide-react";

import { t } from "@/lib/i18n";

/**
 * Событие установки. В типах TS его нет — оно нестандартное
 * и поддерживается только браузерами на Chromium.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

type Platform = "standalone" | "ios" | "other";

const STANDALONE_QUERY = "(display-mode: standalone)";

/** Подписка на смену режима отображения: пользователь может открыть сайт из установленного приложения. */
function subscribe(onChange: () => void) {
  const media = window.matchMedia(STANDALONE_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** Возвращает строку, а не объект: иначе каждый снимок был бы новой ссылкой и рендер зациклился бы. */
function getSnapshot(): Platform {
  if (window.matchMedia(STANDALONE_QUERY).matches) return "standalone";
  if (/iphone|ipad|ipod/i.test(window.navigator.userAgent)) return "ios";
  return "other";
}

/** На сервере платформа неизвестна — считаем, что приложение уже установлено, и ничего не рисуем. */
function getServerSnapshot(): Platform {
  return "standalone";
}

/**
 * Блок установки приложения на домашний экран.
 *
 * Android (Chromium): перехватываем `beforeinstallprompt` и показываем свою кнопку,
 * чтобы предложение появлялось в понятный момент, а не когда решит браузер.
 *
 * iOS: события установки в Safari нет вообще, поэтому единственный вариант —
 * текстовая инструкция про «Поділитися → На екран «Додому»».
 *
 * Если приложение уже запущено с домашнего экрана, блок не показывается.
 */
export function InstallHint() {
  const platform = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      // Иначе Chrome покажет свой баннер в неудобный момент
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  if (platform === "standalone") return null;

  if (promptEvent) {
    return (
      <button
        type="button"
        onClick={() => {
          void promptEvent.prompt();
          setPromptEvent(null);
        }}
        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border border-border text-[15px] font-semibold text-text transition-colors duration-150 active:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <Download className="size-[18px]" strokeWidth={2} aria-hidden />
        {t.welcome.install}
      </button>
    );
  }

  if (platform === "ios") {
    return (
      <p className="mt-4 flex items-start gap-2 text-[13px] font-medium text-text-muted">
        <Share className="mt-px size-4 shrink-0" strokeWidth={2} aria-hidden />
        {t.welcome.installIos}
      </p>
    );
  }

  return null;
}
