"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatApiError } from "@/lib/formErrors";
import { useT } from "@/components/i18n/LocaleProvider";

export function AddPhoneForm({ firstName, next }) {
  const t = useT();
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: formData.get("phone"),
          whatsappOptIn: formData.get("whatsappOptIn") === "on"
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatApiError(payload, t("auth.addPhone.error"), t));
      }
      router.push(next);
      router.refresh();
    } catch (submitError) {
      setError(submitError.message);
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="auth-form-header">
        <h2>{t("auth.addPhone.title", { name: firstName })}</h2>
        <p>{t("auth.addPhone.intro")}</p>
      </div>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          <span>{t("auth.phone")}</span>
          <input autoComplete="tel" autoFocus name="phone" placeholder="+91 98765 43210" required type="tel" />
        </label>
        <label className="check-row">
          <input name="whatsappOptIn" type="checkbox" />
          <span>{t("auth.whatsappOptIn")}</span>
        </label>
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
        <button className="button button-primary auth-submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? t("common.saving") : t("auth.addPhone.continue")}
        </button>
      </form>
    </>
  );
}
