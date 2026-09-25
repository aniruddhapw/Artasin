"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatApiError } from "@/lib/formErrors";
import { useT } from "@/components/i18n/LocaleProvider";
import { toDateInputValue } from "@/lib/dateOfBirth";

export function DateOfBirthForm({ defaultDateOfBirth }) {
  const t = useT();
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/account/date-of-birth", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateOfBirth: formData.get("dateOfBirth") })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatApiError(payload, t("account.dobFailed"), t));
      }
      setSuccess(t("account.dobSaved"));
      router.refresh();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form account-form" onSubmit={handleSubmit}>
      <label>
        <span>{t("account.dateOfBirth")}</span>
        <small className="field-hint">{t("account.dobHint")}</small>
        <input
          autoComplete="bday"
          defaultValue={toDateInputValue(defaultDateOfBirth)}
          name="dateOfBirth"
          type="date"
        />
      </label>
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      {success ? <p className="account-success" role="status">{success}</p> : null}
      <button className="button button-primary" disabled={isSubmitting} type="submit">
        {isSubmitting ? t("common.saving") : t("account.saveDob")}
      </button>
    </form>
  );
}
