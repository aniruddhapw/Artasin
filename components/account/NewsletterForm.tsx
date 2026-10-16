"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { formatApiError } from "@/lib/formErrors";
import { useT } from "@/components/i18n/LocaleProvider";
import { errorMessage } from "@/lib/errorMessage";

export function NewsletterForm({ defaultNewsletterOptIn }: { defaultNewsletterOptIn: boolean }) {
  const t = useT();
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const newsletterOptIn = formData.get("newsletterOptIn") === "on";
    try {
      const response = await fetch("/api/account/newsletter", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newsletterOptIn })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatApiError(payload, t("account.newsletterFailed"), t));
      }
      setSuccess(newsletterOptIn ? t("account.newsletterOn") : t("account.newsletterOff"));
      router.refresh();
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form account-form" onSubmit={handleSubmit}>
      <label className="check-row">
        <input defaultChecked={defaultNewsletterOptIn} name="newsletterOptIn" type="checkbox" />
        <span>{t("auth.newsletterOptIn")}</span>
      </label>
      <p className="field-hint">{t("account.newsletterHint")}</p>
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      {success ? <p className="account-success" role="status">{success}</p> : null}
      <button className="button button-primary" disabled={isSubmitting} type="submit">
        {isSubmitting ? t("common.saving") : t("account.savePreferences")}
      </button>
    </form>
  );
}
