"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatApiError } from "@/lib/formErrors";
import { useT } from "@/components/i18n/LocaleProvider";

export function PhoneForm({ defaultPhone, defaultWhatsappOptIn }) {
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
        throw new Error(formatApiError(payload, "Unable to update your phone number", t));
      }
      setSuccess(t("account.phoneUpdated"));
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
        <span>{t("auth.phone")}</span>
        <input
          autoComplete="tel"
          defaultValue={defaultPhone || ""}
          name="phone"
          placeholder="+91 98765 43210"
          required
          type="tel"
        />
      </label>
      <label className="check-row">
        <input defaultChecked={defaultWhatsappOptIn} name="whatsappOptIn" type="checkbox" />
        <span>{t("auth.whatsappOptIn")}</span>
      </label>
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      {success ? <p className="account-success" role="status">{success}</p> : null}
      <button className="button button-primary" disabled={isSubmitting} type="submit">
        {isSubmitting ? t("common.saving") : t("account.updatePhone")}
      </button>
    </form>
  );
}
