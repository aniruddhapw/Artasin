"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { en, type Dictionary } from "@/lib/i18n/dictionaries";
import { DEFAULT_LOCALE, format, type Locale, type Translate } from "@/lib/i18n/shared";

interface LocaleContextValue {
  locale: Locale;
  messages: Dictionary;
}

const LocaleContext = createContext<LocaleContextValue>({ locale: DEFAULT_LOCALE, messages: en });

/**
 * Seeded from the server so the first client render already has the right
 * language — no flash of English before hydration.
 */
export function LocaleProvider({
  children,
  locale,
  messages
}: {
  children: ReactNode;
  locale: Locale;
  messages: Dictionary;
}) {
  const value = useMemo(() => ({ locale, messages }), [locale, messages]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** Client components: `const t = useT();` then `t("artwork.form.title")`. */
export function useT(): Translate {
  const { messages } = useContext(LocaleContext);
  return (key, vars) => format(messages, key, vars);
}

export function useLocale(): Locale {
  return useContext(LocaleContext).locale;
}
