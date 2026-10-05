import { en } from "./en";
import type { Dict } from "./index";
import type { Locale } from "./locales";
import { nl } from "./nl";
import { uk } from "./uk";

const dictionaries: Record<Locale, Dict> = { uk, en, nl };

export function getDictionary(locale: Locale): Dict {
  return dictionaries[locale];
}
