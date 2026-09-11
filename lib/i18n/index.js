import { cookies } from "next/headers";
import { dictionaries, en } from "@/lib/i18n/dictionaries";

export const LOCALES = ["en", "mr"];
export const DEFAULT_LOCALE = "en";
export const LOCALE_COOKIE = "locale";

export function isLocale(value) {
  return LOCALES.includes(value);
}

/**
 * Builds a translate function for a locale. A key missing from the chosen
 * locale falls back to English, and a key missing everywhere returns itself —
 * a half-translated screen is recoverable, a screen full of raw keys is not.
 */
export function createTranslator(locale) {
  const dictionary = dictionaries[locale] || en;
  return function t(key, vars) {
    const template = dictionary[key] ?? en[key] ?? key;
    if (!vars) {
      return template;
    }
    return Object.entries(vars).reduce(
      (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
      template
    );
  };
}

/** Server components: the locale the visitor has chosen, from their cookie. */
export async function getLocale() {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Server components: `const { t, locale } = await getTranslations();` */
export async function getTranslations() {
  const locale = await getLocale();
  return { locale, t: createTranslator(locale), messages: dictionaries[locale] || en };
}
