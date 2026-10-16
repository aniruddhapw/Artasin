import { cookies } from "next/headers";
import { dictionaries, type Dictionary } from "@/lib/i18n/dictionaries";
import { DEFAULT_LOCALE, LOCALE_COOKIE, format, isLocale, type Locale, type Translate } from "@/lib/i18n/shared";

export { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES, hasTranslation, isLocale } from "@/lib/i18n/shared";
export type { Locale, Translate, TranslationVars } from "@/lib/i18n/shared";
export type { Dictionary, TranslationKey } from "@/lib/i18n/dictionaries";

/** Builds a translate function for a locale (see `format` for the fallbacks). */
export function createTranslator(locale: Locale): Translate {
  const dictionary = dictionaries[locale];
  return (key, vars) => format(dictionary, key, vars);
}

/** Server components: the locale the visitor has chosen, from their cookie. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Server components: `const { t, locale } = await getTranslations();` */
export async function getTranslations(): Promise<{ locale: Locale; t: Translate; messages: Dictionary }> {
  const locale = await getLocale();
  return { locale, t: createTranslator(locale), messages: dictionaries[locale] };
}
