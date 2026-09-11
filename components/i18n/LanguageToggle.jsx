"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useLocale, useT } from "@/components/i18n/LocaleProvider";

export function LanguageToggle() {
  const router = useRouter();
  const locale = useLocale();
  const t = useT();
  const [isPending, startTransition] = useTransition();
  const [isSwitching, setIsSwitching] = useState(false);

  async function choose(next) {
    if (next === locale) {
      return;
    }
    setIsSwitching(true);
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next })
    });
    // Server components read the locale from the cookie, so the tree has to be
    // re-rendered on the server for the new language to appear.
    startTransition(() => {
      router.refresh();
      setIsSwitching(false);
    });
  }

  const busy = isPending || isSwitching;

  return (
    <div aria-label={t("common.language")} className="language-toggle" role="group">
      <button
        aria-pressed={locale === "en"}
        className={locale === "en" ? "language-option is-active" : "language-option"}
        disabled={busy}
        lang="en"
        onClick={() => choose("en")}
        type="button"
      >
        EN
      </button>
      <button
        aria-pressed={locale === "mr"}
        className={locale === "mr" ? "language-option is-active" : "language-option"}
        disabled={busy}
        lang="mr"
        onClick={() => choose("mr")}
        type="button"
      >
        मराठी
      </button>
    </div>
  );
}
