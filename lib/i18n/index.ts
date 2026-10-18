import { cookies } from "next/headers";
import { cache } from "react";
import { getAuthUser } from "@/lib/auth";
import { dictionaries, type Dictionary } from "@/lib/i18n/dictionaries";
import { DEFAULT_LOCALE, LOCALE_COOKIE, format, isLocale, type Locale, type Translate } from "@/lib/i18n/shared";

export { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES, hasTranslation, isLocale, translateOr } from "@/lib/i18n/shared";
export type { Locale, Translate, TranslationVars } from "@/lib/i18n/shared";
export type { Dictionary, TranslationKey } from "@/lib/i18n/dictionaries";

/** Builds a translate function for a locale (see `format` for the fallbacks). */
export function createTranslator(locale: Locale): Translate {
  const dictionary = dictionaries[locale];
  return (key, vars) => format(dictionary, key, vars);
}

/**
 * Whether the visitor is a signed-in artist, the only people offered a
 * language other than English. Cached per request, as every server component
 * that translates asks.
 */
export const viewerIsArtist = cache(async (): Promise<boolean> => (await getAuthUser())?.role === "ARTIST");

/**
 * Server components: the locale the visitor has chosen, from their cookie.
 * Only artists can choose, so anyone else gets English even if their browser
 * still has an older choice saved.
 */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  if (!isLocale(value) || value === DEFAULT_LOCALE) {
    return DEFAULT_LOCALE;
  }
  return (await viewerIsArtist()) ? value : DEFAULT_LOCALE;
}

/** Server components: `const { t, locale } = await getTranslations();` */
export async function getTranslations(): Promise<{ locale: Locale; t: Translate; messages: Dictionary }> {
  const locale = await getLocale();
  return { locale, t: createTranslator(locale), messages: dictionaries[locale] };
}
