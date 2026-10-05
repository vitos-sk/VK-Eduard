"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { Dict } from "./index";
import type { Locale } from "./locales";

interface I18nValue {
  locale: Locale;
  t: Dict;
}

const I18nContext = createContext<I18nValue | null>(null);

/** Кладёт язык и словарь в контекст. Стоит в корневом layout, словарь приходит с сервера. */
export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dict;
  children: ReactNode;
}) {
  return <I18nContext value={{ locale, t: dict }}>{children}</I18nContext>;
}

function useI18n(): I18nValue {
  const value = useContext(I18nContext);

  if (!value) {
    throw new Error("useT/useLocale вызваны вне I18nProvider");
  }

  return value;
}

/** Словарь текущего языка в клиентских компонентах: `const t = useT();`. */
export function useT(): Dict {
  return useI18n().t;
}

export function useLocale(): Locale {
  return useI18n().locale;
}
