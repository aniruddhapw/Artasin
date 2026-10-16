import { en, type Dictionary, type TranslationKey } from "@/lib/i18n/dictionaries";

/**
 * The parts of i18n that both server and browser code use. lib/i18n/index.ts
 * adds the server-only pieces (it reads cookies), so client components import
 * from here or from components/i18n/LocaleProvider.
 */

export const LOCALES = ["en", "mr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "locale";

export type TranslationVars = Record<string, string | number>;
export type Translate = (key: TranslationKey, vars?: TranslationVars) => string;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Whether a key built at runtime (from a database value, say) has a
 * translation, so it can be passed to `t` safely; otherwise show the value.
 */
export function hasTranslation(key: string): key is TranslationKey {
  return Object.hasOwn(en, key);
}

/**
 * Looks a key up and fills in `{name}` placeholders. A key missing from the
 * chosen locale falls back to English, and one missing everywhere returns
 * itself — a half-translated screen is recoverable, a screen full of raw keys
 * is not.
 */
export function format(dictionary: Partial<Dictionary>, key: TranslationKey, vars?: TranslationVars): string {
  const template = dictionary[key] ?? en[key] ?? key;
  if (!vars) {
    return template;
  }
  return Object.entries(vars).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template
  );
}

/** English, for code that has no locale (emails, admin screens). */
export const english: Translate = (key, vars) => format(en, key, vars);

/**
 * Translates a key built from data (a category or style typed by an artist,
 * say), or shows `fallback` when no translation exists — the value as
 * written is more useful than a raw key.
 */
export function translateOr(t: Translate, key: string, fallback: string): string {
  return hasTranslation(key) ? t(key) : fallback;
}
