import { fmt } from "@/lib/format";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/locales";

/** Куда ведёт нажатие на уведомление шефа — страница нового отчёта. */
export function reportUrl(reportId: string): string {
  return `/reports/${reportId}`;
}

/**
 * Уведомление уходит с сервера, поэтому тексты на трёх языках лежат здесь (как у напоминания и у чатов).
 * Формулировка без рода: «Новий звіт: {name}», а не «створив / створила».
 */
const TEXTS: Record<Locale, { title: string; withSite: string; noSite: string }> = {
  uk: { title: "Новий звіт", withSite: "{name} · {site}", noSite: "{name}" },
  en: { title: "New report", withSite: "{name} · {site}", noSite: "{name}" },
  nl: { title: "Nieuw rapport", withSite: "{name} · {site}", noSite: "{name}" },
};

/** Предел длины: длинное название объекта система всё равно обрежет. */
const BODY_MAX = 140;

export function reportCreatedPushText(locale: string, params: { name: string; site: string | null }): { title: string; body: string } {
  const texts = TEXTS[isLocale(locale) ? locale : DEFAULT_LOCALE];
  const site = params.site?.trim();
  const body = fmt(site ? texts.withSite : texts.noSite, { name: params.name, site: site ?? "" });

  return { title: texts.title, body: body.length > BODY_MAX ? `${body.slice(0, BODY_MAX - 1)}…` : body };
}
