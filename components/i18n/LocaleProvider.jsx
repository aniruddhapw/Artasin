"use client";

import { createContext, useContext, useMemo } from "react";
import { en } from "@/lib/i18n/dictionaries";

const LocaleContext = createContext({ locale: "en", messages: en });

/**
 * Seeded from the server so the first client render already has the right
 * language — no flash of English before hydration.
 */
export function LocaleProvider({ children, locale, messages }) {
  const value = useMemo(() => ({ locale, messages }), [locale, messages]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** Client components: `const t = useT();` then `t("artwork.form.title")`. */
export function useT() {
  const { messages } = useContext(LocaleContext);
  return function t(key, vars) {
    const template = messages?.[key] ?? en[key] ?? key;
    if (!vars) {
      return template;
    }
    return Object.entries(vars).reduce(
      (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
      template
    );
  };
}

export function useLocale() {
  return useContext(LocaleContext).locale;
}
